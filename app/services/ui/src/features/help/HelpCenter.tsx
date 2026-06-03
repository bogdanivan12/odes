import { useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import SearchIcon from '@mui/icons-material/Search';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import MenuBookRoundedIcon from '@mui/icons-material/MenuBookRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme, alpha } from '@mui/material/styles';
import PageContainer from '../layout/PageContainer';
import {
  HELP_SECTIONS, HELP_CONCEPTS, SETUP_ORDER, GLOSSARY, conceptById,
  type HelpRole, type HelpConcept,
} from './content';

type RoleTab = 'all' | HelpRole;
const ROLE_TABS: { value: RoleTab; label: string }[] = [
  { value: 'all', label: 'Everything' },
  { value: 'admin', label: 'For admins' },
  { value: 'professor', label: 'For professors' },
  { value: 'student', label: 'For students' },
];

export default function HelpCenter() {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [query, setQuery] = useState('');
  const [role, setRole] = useState<RoleTab>('all');
  const [expanded, setExpanded] = useState<string | null>(null);

  const matchesRole = (c: HelpConcept) =>
    role === 'all' || c.roles.length === 0 || c.roles.includes(role);

  const matchesQuery = (c: HelpConcept) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return [c.title, c.short, ...c.body, ...(c.steps ?? [])]
      .join(' ').toLowerCase().includes(q);
  };

  const visible = useMemo(
    () => HELP_CONCEPTS.filter((c) => matchesRole(c) && matchesQuery(c)),
    [role, query],
  );
  const visibleIds = new Set(visible.map((c) => c.id));

  const goToConcept = (id: string) => {
    setExpanded(id);
    // Defer so the accordion is mounted/expanded before we scroll to it.
    requestAnimationFrame(() => {
      document.getElementById(`concept-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  };

  // Deep link: /help#conceptId expands and scrolls to that concept.
  useEffect(() => {
    const id = location.hash.replace('#', '');
    if (!id) return;
    setExpanded(id);
    const t = setTimeout(() => {
      document.getElementById(`concept-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 120);
    return () => clearTimeout(t);
  }, [location.hash]);

  const showSetup = role === 'all' || role === 'admin';

  return (
    <PageContainer alignItems="flex-start">
      <Box sx={{ width: '100%', maxWidth: 880, mx: 'auto' }}>
        <Stack spacing={3}>
          {/* ── Header ── */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ width: 48, height: 48, borderRadius: 3, flexShrink: 0, bgcolor: alpha(theme.palette.primary.main, 0.12), color: 'primary.main', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <MenuBookRoundedIcon />
            </Box>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800, lineHeight: 1.2 }}>Help & user guide</Typography>
              <Typography variant="body2" color="text.secondary">
                Everything you need to understand and use ODES.
              </Typography>
            </Box>
          </Box>

          {/* ── Search + role filter ── */}
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
            <TextField
              fullWidth size="small" placeholder="Search the guide…"
              value={query} onChange={(e) => setQuery(e.target.value)}
              slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" color="disabled" /></InputAdornment> } }}
              sx={{ mb: 1.5, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />
            <Tabs
              value={role} onChange={(_, v) => setRole(v)} variant="scrollable" scrollButtons="auto"
              sx={{ minHeight: 0, '& .MuiTab-root': { minHeight: 0, py: 1, textTransform: 'none', fontWeight: 600 } }}
            >
              {ROLE_TABS.map((t) => <Tab key={t.value} value={t.value} label={t.label} />)}
            </Tabs>
          </Paper>

          {/* ── Setup order (admins) ── */}
          {showSetup && !query && (
            <Paper variant="outlined" sx={{ p: { xs: 2.5, md: 3 }, borderRadius: 3, bgcolor: alpha(theme.palette.primary.main, 0.03) }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>Setup order</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                New here? Build your schedule by following these steps in order.
              </Typography>
              <Stack spacing={1}>
                {SETUP_ORDER.map((step, i) => (
                  <Box
                    key={step.conceptId}
                    onClick={() => goToConcept(step.conceptId)}
                    sx={{
                      display: 'flex', alignItems: 'center', gap: 1.5, p: 1, borderRadius: 2, cursor: 'pointer',
                      '&:hover': { bgcolor: 'action.hover' },
                    }}
                  >
                    <Box sx={{ width: 26, height: 26, borderRadius: '50%', flexShrink: 0, bgcolor: 'primary.main', color: 'primary.contrastText', fontSize: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {i + 1}
                    </Box>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{step.label}</Typography>
                    <Box sx={{ flex: 1 }} />
                    <ArrowForwardRoundedIcon sx={{ fontSize: '1rem', color: 'text.disabled' }} />
                  </Box>
                ))}
              </Stack>
            </Paper>
          )}

          {/* ── Concept sections ── */}
          {HELP_SECTIONS.map((section) => {
            const concepts = visible.filter((c) => c.section === section.id);
            if (concepts.length === 0) return null;
            return (
              <Box key={section.id}>
                <Typography variant="overline" color="primary" sx={{ fontWeight: 700, letterSpacing: '0.08em' }}>
                  {section.title}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>{section.subtitle}</Typography>
                <Stack spacing={1}>
                  {concepts.map((c) => (
                    <Accordion
                      key={c.id} id={`concept-${c.id}`}
                      expanded={expanded === c.id}
                      onChange={(_, isOpen) => setExpanded(isOpen ? c.id : null)}
                      disableGutters elevation={0}
                      sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '12px !important', '&:before': { display: 'none' }, overflow: 'hidden' }}
                    >
                      <AccordionSummary expandIcon={<ExpandMoreRoundedIcon />}>
                        <Box>
                          <Typography sx={{ fontWeight: 700 }}>{c.title}</Typography>
                          <Typography variant="body2" color="text.secondary">{c.short}</Typography>
                        </Box>
                      </AccordionSummary>
                      <AccordionDetails sx={{ pt: 0 }}>
                        <Divider sx={{ mb: 2 }} />
                        <Stack spacing={1.5}>
                          {c.body.map((p, idx) => (
                            <Typography key={idx} variant="body2" sx={{ lineHeight: 1.7 }}>{p}</Typography>
                          ))}

                          {c.steps && (
                            <Box component="ol" sx={{ m: 0, pl: 2.5, '& li': { mb: 0.5 } }}>
                              {c.steps.map((s, idx) => (
                                <Typography component="li" key={idx} variant="body2">{s}</Typography>
                              ))}
                            </Box>
                          )}

                          {(c.related?.length || c.route) && (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center', pt: 0.5 }}>
                              {c.related?.map((rid) => {
                                const rc = conceptById(rid);
                                if (!rc) return null;
                                return (
                                  <Chip
                                    key={rid} label={rc.title} size="small" variant="outlined"
                                    onClick={() => goToConcept(rid)}
                                    sx={{ cursor: 'pointer', opacity: visibleIds.has(rid) ? 1 : 0.6 }}
                                  />
                                );
                              })}
                              <Box sx={{ flex: 1 }} />
                              {c.route && (
                                <Button size="small" endIcon={<ArrowForwardRoundedIcon />} onClick={() => navigate(c.route!)} sx={{ textTransform: 'none' }}>
                                  Go there
                                </Button>
                              )}
                            </Box>
                          )}
                        </Stack>
                      </AccordionDetails>
                    </Accordion>
                  ))}
                </Stack>
              </Box>
            );
          })}

          {visible.length === 0 && (
            <Paper variant="outlined" sx={{ p: 4, borderRadius: 3, textAlign: 'center' }}>
              <Typography color="text.secondary">No topics match “{query}”.</Typography>
            </Paper>
          )}

          {/* ── Glossary ── */}
          {!query && (
            <Box>
              <Typography variant="overline" color="primary" sx={{ fontWeight: 700, letterSpacing: '0.08em' }}>Glossary</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>Quick definitions of every term.</Typography>
              <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
                {GLOSSARY.map((g, i) => (
                  <Box key={g.term} sx={{ display: 'flex', gap: 2, px: 2, py: 1.25, borderTop: i === 0 ? 'none' : '1px solid', borderColor: 'divider' }}>
                    <Typography variant="body2" sx={{ fontWeight: 700, minWidth: 120, flexShrink: 0 }}>{g.term}</Typography>
                    <Typography variant="body2" color="text.secondary">{g.definition}</Typography>
                  </Box>
                ))}
              </Paper>
            </Box>
          )}

          <Box sx={{ height: 24 }} />
        </Stack>
      </Box>
    </PageContainer>
  );
}
