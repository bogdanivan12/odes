import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import { useNavigate } from 'react-router-dom';
import PageContainer from '../layout/PageContainer';

export function Home() {
  const navigate = useNavigate();

  return (
    <PageContainer alignItems="center">
      <Box sx={{ width: '100%', textAlign: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 3, lineHeight: 1 }}>
          <CalendarMonthIcon
            aria-label="ODES Calendar Logo"
            sx={{
              width: 64,
              height: 64,
              mr: 1,
              mt: -1,
              color: '#2196F3',
              filter: 'drop-shadow(0 0 20px rgba(33, 150, 243, 0.6)) drop-shadow(0 0 10px rgba(33, 203, 243, 0.4))',
              display: 'block',
            }}
          />
          <Typography
            variant="h2"
            component="h1"
            sx={{
              fontWeight: 800,
              background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              textShadow: '0 0 40px rgba(33, 150, 243, 0.5)',
              filter: 'drop-shadow(0 0 20px rgba(33, 150, 243, 0.3))',
            }}
          >
            ODES
          </Typography>
        </Box>
        <Typography variant="h4" sx={{ fontWeight: 600, mb: 2 }}>
          Scheduling made simple
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ mb: 4 }}>
          Create, manage and visualize schedules for your institution — fast and collaboratively.
        </Typography>

        <Button
          variant="contained"
          size="large"
          onClick={() => navigate('/institutions')}
          sx={{ mt: 2 }}
        >
          View Institutions
        </Button>
      </Box>
    </PageContainer>
  );
}
