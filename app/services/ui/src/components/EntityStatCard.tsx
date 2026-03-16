import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import CircularProgress from '@mui/material/CircularProgress';

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
  gradient = false,
  centerContent = false,
}: EntityStatCardProps) {
  const shouldWrapValue = typeof value === 'string' || typeof value === 'number';

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        borderRadius: 3,
        height: '100%',
        display: 'flex',
        alignItems: centerContent ? 'center' : 'stretch',
        ...(gradient
          ? {
            background: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
          }
          : {}),
      }}
    >
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ width: '100%' }}>
        <Avatar sx={{ bgcolor: 'primary.main', width: 34, height: 34 }}>{icon}</Avatar>
        <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: centerContent ? 'center' : 'flex-start' }}>
          <Typography variant="caption" color="text.secondary">{label}</Typography>
          {loading
            ? <CircularProgress size={18} />
            : shouldWrapValue
              ? <Typography variant="h6" sx={{ lineHeight: 1.1, fontWeight: 700 }}>{value}</Typography>
              : value}
        </Box>
      </Stack>
    </Paper>
  );
}

