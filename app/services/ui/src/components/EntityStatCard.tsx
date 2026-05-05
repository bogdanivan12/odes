import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import CircularProgress from '@mui/material/CircularProgress';
import { alpha } from '@mui/material/styles';
import { useTheme } from '@mui/material/styles';

type EntityStatCardProps = {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  loading?: boolean;
  gradient?: boolean;
  centerContent?: boolean;
};

export default function EntityStatCard({
  icon,
  label,
  value,
  loading = false,
}: EntityStatCardProps) {
  const theme = useTheme();
  const shouldWrapValue = typeof value === 'string' || typeof value === 'number';

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2.5,
        borderRadius: 3,
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        transition: 'transform 150ms ease, box-shadow 150ms ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.1)}`,
        },
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          width: 3,
          height: '100%',
          bgcolor: 'primary.main',
          background: `linear-gradient(180deg, ${theme.palette.primary.light}, ${theme.palette.primary.dark})`,
        },
        pl: 3,
      }}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
        <Box>
          <Typography
            variant="caption"
            sx={{ color: 'text.secondary', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', mb: 0.5 }}
          >
            {label}
          </Typography>
          {loading ? (
            <CircularProgress size={20} />
          ) : shouldWrapValue ? (
            <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1, color: 'text.primary' }}>
              {value}
            </Typography>
          ) : (
            value
          )}
        </Box>
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: alpha(theme.palette.primary.main, 0.1),
            color: 'primary.main',
            flexShrink: 0,
          }}
        >
          {icon}
        </Box>
      </Stack>
    </Paper>
  );
}
