package handlers

// [BTMH patch] Tự động lấy ảnh đại diện từ nhà cung cấp OAuth (vd Google `picture`)
// và lưu làm avatar tùy chỉnh cho user khi đăng nhập. File này được copy vào
// app/handlers/ bởi scripts/apply-source-patches.sh trước khi build.

import (
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/getfider/fider/app/models/cmd"
	"github.com/getfider/fider/app/models/dto"
	"github.com/getfider/fider/app/models/entity"
	"github.com/getfider/fider/app/models/enum"
	"github.com/getfider/fider/app/pkg/bus"
	"github.com/getfider/fider/app/pkg/web"
)

// importOAuthAvatar tải ảnh từ avatarURL và gán làm avatar tùy chỉnh cho user.
// Best-effort: mọi lỗi đều bỏ qua, KHÔNG chặn đăng nhập. Chỉ chạy khi user chưa có
// avatar tùy chỉnh (để không tải lại mỗi lần đăng nhập).
func importOAuthAvatar(c *web.Context, user *entity.User, avatarURL string) {
	if user == nil || avatarURL == "" || user.AvatarType == enum.AvatarTypeCustom {
		return
	}

	client := &http.Client{Timeout: 8 * time.Second}
	resp, err := client.Get(avatarURL)
	if err != nil {
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return
	}
	contentType := resp.Header.Get("Content-Type")
	if !strings.HasPrefix(contentType, "image/") {
		return
	}

	content, err := io.ReadAll(io.LimitReader(resp.Body, 2*1024*1024)) // tối đa 2MB
	if err != nil || len(content) == 0 {
		return
	}

	avatar := &dto.ImageUpload{
		Upload: &dto.ImageUploadData{
			FileName:    "oauth-avatar",
			ContentType: contentType,
			Content:     content,
		},
	}

	// Đặt user hiện tại lên context để UpdateCurrentUser cập nhật đúng user này.
	c.SetUser(user)
	_ = bus.Dispatch(c,
		&cmd.UploadImage{Image: avatar, Folder: "avatars"},
		&cmd.UpdateCurrentUser{Name: user.Name, Avatar: avatar, AvatarType: enum.AvatarTypeCustom},
	)
}
