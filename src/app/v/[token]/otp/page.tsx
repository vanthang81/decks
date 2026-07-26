export const dynamic = 'force-dynamic';

export default function OtpPage({
  params,
  searchParams,
}: {
  params: { token: string };
  searchParams: { error?: string };
}) {
  return (
    <main className="wrap" style={{ maxWidth: 440 }}>
      <div className="brand">Xác thực</div>
      <h1 style={{ fontSize: 28 }}>Nhập mã truy cập</h1>
      <p className="sub">Chúng tôi đã gửi mã 6 số tới email của bạn. Mã hết hạn sau 10 phút.</p>
      {searchParams.error && (
        <p style={{ color: '#b04a32', fontSize: 14 }}>Mã không đúng hoặc đã hết hạn. Thử lại.</p>
      )}
      <form method="post" action="/api/otp">
        <input type="hidden" name="token" value={params.token} />
        <label htmlFor="code">Mã 6 số</label>
        <input id="code" name="code" inputMode="numeric" pattern="[0-9]*" maxLength={6} autoFocus required />
        <div style={{ marginTop: 16 }}>
          <button className="btn primary" type="submit">Xem deck</button>
        </div>
      </form>
    </main>
  );
}
