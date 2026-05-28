import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);

  // Show error messages from Google OAuth redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get("error");
    if (error === "not_allowed") toast.error("此 Gmail 帳號沒有存取權限，請聯繫管理員");
    else if (error === "token_failed") toast.error("Google 登入失敗，請再試一次");
    else if (error === "server_error") toast.error("伺服器錯誤，請稍後再試");
  }, []);

  const handleGoogleLogin = () => {
    setLoading(true);
    window.location.href = "/api/auth/google";
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-3">
            <img src="/logo.png" alt="知愛家" className="h-16 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          </div>
          <CardTitle className="text-2xl">知愛家管理平台</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">請使用授權的 Gmail 帳號登入</p>
        </CardHeader>
        <CardContent className="pt-4">
          <Button
            className="w-full flex items-center justify-center gap-3 h-12 text-base"
            variant="outline"
            onClick={handleGoogleLogin}
            disabled={loading}
          >
            {loading ? (
              <span>跳轉中...</span>
            ) : (
              <>
                <svg width="20" height="20" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                </svg>
                使用 Google 帳號登入
              </>
            )}
          </Button>
          <p className="text-center text-xs text-muted-foreground mt-4">
            僅限授權的 Gmail 帳號可登入
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
