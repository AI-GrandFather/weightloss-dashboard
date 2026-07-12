"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { verifyPasscode } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldAlert, ShieldCheck, Lock } from "lucide-react";

export default function GatePage() {
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcode) return;

    setLoading(true);
    setError("");

    try {
      const isValid = await verifyPasscode(passcode);
      if (isValid) {
        setSuccess(true);
        setTimeout(() => {
          router.push("/");
          router.refresh();
        }, 800);
      } else {
        setError("Incorrect passcode. Access denied.");
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-tr from-slate-950 via-slate-900 to-zinc-900 px-4 py-12 font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-900/10 via-transparent to-transparent pointer-events-none" />
      
      <Card className="w-full max-w-md border-zinc-800 bg-zinc-950/70 backdrop-blur-xl shadow-2xl shadow-black/50 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-indigo-500 to-transparent" />
        
        <CardHeader className="text-center pt-8">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-900 border border-zinc-800 text-indigo-400">
            {success ? (
              <ShieldCheck className="h-6 w-6 text-emerald-400 animate-pulse" />
            ) : error ? (
              <ShieldAlert className="h-6 w-6 text-rose-500" />
            ) : (
              <Lock className="h-5 w-5" />
            )}
          </div>
          <CardTitle className="text-2xl font-semibold tracking-tight text-zinc-100">
            Passcode Required
          </CardTitle>
          <CardDescription className="text-zinc-400 text-sm mt-1">
            This dashboard holds personal health logs. Please enter the passcode to access.
          </CardDescription>
        </CardHeader>
        
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4 pt-2">
            <div className="space-y-1">
              <Input
                type="password"
                placeholder="••••••••"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                disabled={loading || success}
                className="bg-zinc-900/50 border-zinc-800 text-zinc-200 placeholder:text-zinc-600 focus-visible:ring-indigo-500 focus-visible:ring-offset-0 focus-visible:border-indigo-500 h-11 text-center tracking-widest text-lg"
                autoFocus
              />
            </div>
            {error && (
              <p className="text-rose-500 text-xs text-center font-medium bg-rose-500/10 py-2 rounded-lg border border-rose-500/20">
                {error}
              </p>
            )}
            {success && (
              <p className="text-emerald-400 text-xs text-center font-medium bg-emerald-500/10 py-2 rounded-lg border border-emerald-500/20">
                Correct! Redirecting to dashboard...
              </p>
            )}
          </CardContent>
          <CardFooter className="pb-8 pt-2">
            <Button
              type="submit"
              disabled={loading || success || !passcode}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium h-11 transition-all duration-200 shadow-lg shadow-indigo-600/25 active:scale-[0.98] disabled:opacity-50 disabled:scale-100"
            >
              {loading ? "Verifying..." : "Access Dashboard"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
