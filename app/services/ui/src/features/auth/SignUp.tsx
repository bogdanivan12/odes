import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  Container,
  Paper,
  Stack,
  TextField,
  Typography,
  CircularProgress,
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { SignUpRequest } from "./types";
import { signUp } from "../../api/auth.ts";
import {USER_LOGIN_ROUTE} from "../../config/routes.ts";

export function SignUp() {
  // clear any stale auth token when arriving on the sign-up page
  useEffect(() => {
    try {
      localStorage.removeItem('authToken');
      localStorage.removeItem('selectedInstitutionId');
    } catch (e) { /* ignore */ }
  }, []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    const name = (form.get("name") as string) || "";
    const email = (form.get("email") as string) || "";
    const password = (form.get("password") as string) || "";
    const confirmPassword = (form.get("confirmPassword") as string) || "";

    // client-side validation: password === confirmPassword
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    // build the typed request and run its internal validation
    let request: SignUpRequest;
    try {
      request = new SignUpRequest({ name, email, password });
      request.validate();
    } catch (err) {
      setError((err as Error).message || "Invalid input");
      return;
    }

    setLoading(true);
    try {
      const data = await signUp(request);
      console.log("signup success:", data);
      // TODO: navigate or show success UI
    } catch (err) {
      console.error(err);
      setError((err as Error).message || "Sign up failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        width: "100vw",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "background.default",
        p: 2,
      }}
    >
      <Container maxWidth="xs">
        <Paper elevation={24} sx={{ p: 5 }}>
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <Typography variant="h4" gutterBottom sx={{ mb: 2 }}>
              Sign Up
            </Typography>

            <Box component="form" noValidate onSubmit={handleSubmit} sx={{ mt: 2 }}>
              <Stack spacing={3}>
                <TextField variant={"outlined"} required fullWidth id="name" label="Full Name" name="name" autoComplete="name" />
                <TextField variant={"outlined"} required fullWidth id="email" label="Email Address" name="email" autoComplete="email" />
                <TextField variant={"outlined"} required fullWidth name="password" label="Password" type="password" id="password" autoComplete="new-password" />
                <TextField variant={"outlined"} required fullWidth name="confirmPassword" label="Confirm Password" type="password" id="confirmPassword" autoComplete="new-password" />
                <Button type="submit" fullWidth variant="contained" size={"large"} sx={{ mt: 2 }} disabled={loading}>
                  {loading ? <CircularProgress size={20} color="inherit" /> : "Create account"}
                </Button>
              </Stack>
            </Box>
            {error && (
              <Typography color="error" variant="body2" align={"center"} sx={{ mt: 2 }}>
                {error}
              </Typography>
            )}

            {/* small helper: link to login page if user already has an account */}
            <Typography variant="body2" sx={{ mt: 2 }}>
              Already have an account?{' '}
              <RouterLink to={USER_LOGIN_ROUTE} style={{ textDecoration: 'none', color: 'inherit', fontWeight: 600 }}>
                Sign In
              </RouterLink>
            </Typography>

          </Box>
        </Paper>
      </Container>
    </Box>
  );
}
