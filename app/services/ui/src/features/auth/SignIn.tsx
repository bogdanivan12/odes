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
import {Link as RouterLink, useNavigate} from "react-router-dom";
import {SignInRequest} from "./types";
import { signIn } from "../../api/auth.ts";
import {AuthToken} from "../../types/token.ts";
import {USER_REGISTER_ROUTE} from "../../config/routes.ts";

export function SignIn() {
  // clear any stale auth token when arriving on the sign-in page
  useEffect(() => {
    try {
      localStorage.removeItem('authToken');
      localStorage.removeItem('selectedInstitutionId');
    } catch (e) { /* ignore */ }
  }, []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    const email = (form.get("email") as string) || "";
    const password = (form.get("password") as string) || "";

    // build the typed request and run its internal validation
    let request: SignInRequest;
    try {
      request = new SignInRequest({ email, password });
      request.validate();
    } catch (err) {
      setError((err as Error).message || "Invalid input");
      return;
    }

    setLoading(true);
    try {
      const data = await signIn(request);
      console.log("login success:", data);
      // add auth token in local storage
      const token = AuthToken.fromApi(data);
      localStorage.setItem("authToken", token.getTokenString());
      // navigate to home after successful sign in
      navigate('/', { replace: true });
    } catch (err) {
      console.error(err);
      setError((err as Error).message || "Sign in failed");
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
              Sign In
            </Typography>

            <Box component="form" noValidate onSubmit={handleSubmit} sx={{ mt: 2 }}>
              <Stack spacing={3}>
                <TextField variant={"outlined"} required fullWidth id="email" label="Email Address" name="email" autoComplete="email" />
                <TextField variant={"outlined"} required fullWidth name="password" label="Password" type="password" id="password" autoComplete="current-password" />
                <Button type="submit" fullWidth variant="contained" size={"large"} sx={{ mt: 2 }} disabled={loading}>
                  {loading ? <CircularProgress size={20} color="inherit" /> : "Sign In"}
                </Button>
              </Stack>
            </Box>
            {error && (
              <Typography color="error" variant="body2" align={"center"} sx={{ mt: 2 }}>
                {error}
              </Typography>
            )}

            {/* small helper: link to signup page if user doesn't have an account */}
            <Typography variant="body2" sx={{ mt: 2 }}>
              Don't have an account?{' '}
              <RouterLink to={USER_REGISTER_ROUTE} style={{ textDecoration: 'none', color: 'inherit', fontWeight: 600 }}>
                Register
              </RouterLink>
            </Typography>

          </Box>
        </Paper>
      </Container>
    </Box>
  );
}
