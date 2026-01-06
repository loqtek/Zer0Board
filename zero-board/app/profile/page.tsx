"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { authApi } from "@/lib/api";
import { getErrorMessage } from "@/lib/utils/errors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { User } from "lucide-react";

export default function ProfilePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, isAuthenticated, isLoading: authLoading, refetch } = useAuth();

  // Profile form state
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  // Password form state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Initialize form with user data
  useEffect(() => {
    if (user) {
      setUsername(user.username || "");
      setEmail(user.email || "");
    }
  }, [user]);

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: (data: { username?: string; email?: string }) =>
      authApi.updateProfile(data),
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(["auth", "me"], updatedUser);
      queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      setIsEditingProfile(false);
      toast.success("Profile updated successfully");
      refetch();
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: (data: { current_password: string; new_password: string }) =>
      authApi.changePassword(data),
    onSuccess: () => {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setIsChangingPassword(false);
      toast.success("Password changed successfully");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  // Redirect if not authenticated
  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-[var(--text-muted)]">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    router.push("/login");
    return null;
  }

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updates: { username?: string; email?: string } = {};
    
    if (username !== user?.username) {
      updates.username = username;
    }
    if (email !== user?.email) {
      updates.email = email;
    }

    if (Object.keys(updates).length === 0) {
      toast.info("No changes to save");
      setIsEditingProfile(false);
      return;
    }

    updateProfileMutation.mutate(updates);
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters long");
      return;
    }

    changePasswordMutation.mutate({
      current_password: currentPassword,
      new_password: newPassword,
    });
  };

  const handleCancelProfile = () => {
    setUsername(user?.username || "");
    setEmail(user?.email || "");
    setIsEditingProfile(false);
  };

  const handleCancelPassword = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setIsChangingPassword(false);
  };

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="border-b border-[var(--border)] bg-[var(--card-bg)]">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Zero Board</h1>
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => router.push("/dashboard")}>
              ← Back to Dashboard
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-[var(--foreground)] mb-2">Profile Settings</h2>
          <p className="text-[var(--text-muted)]">Manage your account information and preferences</p>
        </div>

        {/* Profile Information Card */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Profile Information
                </CardTitle>
                <CardDescription>
                  Update your username and email address
                </CardDescription>
              </div>
              {!isEditingProfile && (
                <Button
                  variant="outline"
                  onClick={() => setIsEditingProfile(true)}
                >
                  Edit Profile
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isEditingProfile ? (
              <form onSubmit={handleProfileSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="username" className="text-sm font-medium text-[var(--foreground)]">
                    Username
                  </label>
                  <Input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    placeholder="Enter username"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium text-[var(--foreground)]">
                    Email
                  </label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter email (optional)"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    type="submit"
                    disabled={updateProfileMutation.isPending}
                  >
                    {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancelProfile}
                    disabled={updateProfileMutation.isPending}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-[var(--text-muted)]">Username</label>
                  <p className="text-[var(--foreground)] mt-1">{user?.username || "Not set"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-[var(--text-muted)]">Email</label>
                  <p className="text-[var(--foreground)] mt-1">{user?.email || "Not set"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-[var(--text-muted)]">Account Created</label>
                  <p className="text-[var(--foreground)] mt-1">
                    {user?.created_at ? new Date(user.created_at).toLocaleDateString() : "Unknown"}
                  </p>
                </div>
                {user?.last_login_at && (
                  <div>
                    <label className="text-sm font-medium text-[var(--text-muted)]">Last Login</label>
                    <p className="text-[var(--foreground)] mt-1">
                      {new Date(user.last_login_at).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Change Password Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Change Password</CardTitle>
                <CardDescription>
                  Update your password to keep your account secure
                </CardDescription>
              </div>
              {!isChangingPassword && (
                <Button
                  variant="outline"
                  onClick={() => setIsChangingPassword(true)}
                >
                  Change Password
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isChangingPassword ? (
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="currentPassword" className="text-sm font-medium text-[var(--foreground)]">
                    Current Password
                  </label>
                  <Input
                    id="currentPassword"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    placeholder="Enter current password"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="newPassword" className="text-sm font-medium text-[var(--foreground)]">
                    New Password
                  </label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    placeholder="Enter new password (min 8 characters)"
                    minLength={8}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="confirmPassword" className="text-sm font-medium text-[var(--foreground)]">
                    Confirm New Password
                  </label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    placeholder="Confirm new password"
                    minLength={8}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    type="submit"
                    disabled={changePasswordMutation.isPending}
                  >
                    {changePasswordMutation.isPending ? "Changing..." : "Change Password"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancelPassword}
                    disabled={changePasswordMutation.isPending}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            ) : (
              <p className="text-[var(--text-muted)]">Click "Change Password" to update your password.</p>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

