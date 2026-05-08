import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import GroupsIcon from '@mui/icons-material/Groups';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';
import Paper from '@mui/material/Paper';
import PageContainer from '../layout/PageContainer';
import { INSTITUTIONS_ROUTE, INSTITUTIONS_CREATE_ROUTE, USER_LOGIN_ROUTE, USER_REGISTER_ROUTE } from '../../config/routes';

const FEATURES = [
  {
    icon: <AccountBalanceIcon />,
    title: 'Institution management',
    description: 'Configure groups, courses, rooms and professors in one place.',
  },
  {
    icon: <GroupsIcon />,
    title: 'Group-aware scheduling',
    description: 'Activities inherit parent group schedules automatically — no manual merging.',
  },
  {
    icon: <AutoAwesomeIcon />,
    title: 'Smart visualisation',
    description: 'Students see only their own activities, including bi-weekly and subgroup sessions.',
  },
];

export function LandingPage({ isLoggedIn = false }: { isLoggedIn?: boolean }) {
  const navigate = useNavigate();
  const theme = useTheme();

  return (
    <PageContainer alignItems="center">
      <Box sx={{ width: '100%', maxWidth: 720, mx: 'auto', textAlign: 'center' }}>
        {/* Hero */}
        <Box sx={{ mb: 6 }}>
          <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 72,
                height: 72,
                borderRadius: 4,
                bgcolor: alpha(theme.palette.primary.main, 0.1),
                border: '1px solid',
                borderColor: alpha(theme.palette.primary.main, 0.2),
              }}
            >
              <CalendarMonthIcon sx={{ color: 'primary.main', fontSize: '2rem' }} />
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: 3, color: 'primary.main' }}>
              ODES
            </Typography>
          </Box>

          <Typography
            variant="h3"
            sx={{
              fontWeight: 800,
              lineHeight: 1.15,
              mb: 1,
              background: `linear-gradient(135deg, ${theme.palette.text.primary} 40%, ${theme.palette.primary.main} 100%)`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Scheduling made simple
          </Typography>

          <Typography
            variant="h6"
            color="text.secondary"
            sx={{ fontWeight: 400, lineHeight: 1.6, mb: 4, maxWidth: 520, mx: 'auto' }}
          >
            Create, manage and visualise complex university schedules — collaboratively and without the spreadsheets.
          </Typography>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="center">
            {isLoggedIn ? (
              <>
                <Button
                  variant="contained"
                  size="large"
                  endIcon={<ArrowForwardRoundedIcon />}
                  onClick={() => navigate(INSTITUTIONS_ROUTE)}
                  sx={{ borderRadius: 2, px: 3, py: 1.25 }}
                >
                  View institutions
                </Button>
                <Button
                  variant="outlined"
                  size="large"
                  onClick={() => navigate(INSTITUTIONS_CREATE_ROUTE)}
                  sx={{ borderRadius: 2, px: 3, py: 1.25 }}
                >
                  Create institution
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="contained"
                  size="large"
                  endIcon={<ArrowForwardRoundedIcon />}
                  onClick={() => navigate(USER_LOGIN_ROUTE)}
                  sx={{ borderRadius: 2, px: 3, py: 1.25 }}
                >
                  Sign in
                </Button>
                <Button
                  variant="outlined"
                  size="large"
                  onClick={() => navigate(USER_REGISTER_ROUTE)}
                  sx={{ borderRadius: 2, px: 3, py: 1.25 }}
                >
                  Create account
                </Button>
              </>
            )}
          </Stack>
        </Box>

        {/* Feature cards */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
            gap: 2,
            textAlign: 'left',
          }}
        >
          {FEATURES.map((f) => (
            <Paper
              key={f.title}
              variant="outlined"
              sx={{
                p: 2.5,
                borderRadius: 3,
                transition: 'box-shadow 200ms, transform 200ms',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.1)}`,
                },
              }}
            >
              <Box
                sx={{
                  display: 'inline-flex',
                  p: 1,
                  borderRadius: 2,
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                  color: 'primary.main',
                  mb: 1.5,
                  '& svg': { fontSize: '1.25rem' },
                }}
              >
                {f.icon}
              </Box>
              <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                {f.title}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                {f.description}
              </Typography>
            </Paper>
          ))}
        </Box>
      </Box>
    </PageContainer>
  );
}

// Keep default export alias so existing imports don't break
export { LandingPage as Home };
export default LandingPage;
