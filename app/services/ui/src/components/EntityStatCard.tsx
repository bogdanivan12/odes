import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import CircularProgress from '@mui/material/CircularProgress';

type EntityStatCardProps = {
  icon: React.ReactNode;
  label: string;
  value: number;
  loading?: boolean;
  gradient?: boolean;
};

export default function EntityStatCard({
  icon,
  label,
  value,
  loading = false,
  gradient = false,
}: EntityStatCardProps) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        borderRadius: 3,
        height: '100%',
        ...(gradient
          ? {
            background: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
          }
          : {}),
      }}
    >
      <Stack direction="row" spacing={1.5} alignItems="center">
        <Avatar sx={{ bgcolor: 'primary.main', width: 34, height: 34 }}>{icon}</Avatar>
        <Box>
          <Typography variant="caption" color="text.secondary">{label}</Typography>
          {loading
            ? <CircularProgress size={18} />
            : <Typography variant="h6" sx={{ lineHeight: 1.1, fontWeight: 700 }}>{value}</Typography>}
        </Box>
      </Stack>
    </Paper>
  );
}

