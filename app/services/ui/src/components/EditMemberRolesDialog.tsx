import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import type { InstitutionRole } from '../api/institutions';
import { toTitleLabel } from '../utils/text';

type EditMemberRolesDialogProps = {
  open: boolean;
  memberLabel: string;
  selectedRoles: InstitutionRole[];
  roleOptions: InstitutionRole[];
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onRolesChange: (roles: InstitutionRole[]) => void;
  onSubmit: () => void;
};

export default function EditMemberRolesDialog({
  open,
  memberLabel,
  selectedRoles,
  roleOptions,
  loading,
  error,
  onClose,
  onRolesChange,
  onSubmit,
}: EditMemberRolesDialogProps) {
  return (
    <Dialog open={open} onClose={() => !loading && onClose()} maxWidth="xs" fullWidth>
      <DialogTitle>Edit member roles</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 2 }}>
          Update the roles assigned to this member in the institution.
        </DialogContentText>
        <Stack spacing={2} sx={{ mt: 0.5 }}>
          <TextField label="Member" value={memberLabel} fullWidth disabled />
          <FormControl fullWidth>
            <InputLabel id="edit-member-role-label">Role</InputLabel>
            <Select
              multiple
              labelId="edit-member-role-label"
              label="Role"
              value={selectedRoles}
              onChange={(e) => onRolesChange(e.target.value as InstitutionRole[])}
              renderValue={(selected) => (
                <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap">
                  {(selected as InstitutionRole[]).map((role) => (
                    <Chip key={role} label={toTitleLabel(role)} size="small" />
                  ))}
                </Stack>
              )}
              disabled={loading}
            >
              {roleOptions.map((role) => (
                <MenuItem key={role} value={role}>{toTitleLabel(role)}</MenuItem>
              ))}
            </Select>
          </FormControl>
          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>Cancel</Button>
        <Button onClick={onSubmit} variant="contained" disabled={loading}>
          {loading ? <CircularProgress size={18} color="inherit" /> : 'Save roles'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

