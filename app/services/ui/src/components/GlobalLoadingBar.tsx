import { useEffect, useState } from 'react';
import Fade from '@mui/material/Fade';
import LinearProgress from '@mui/material/LinearProgress';
import { subscribeLoading } from '../utils/loadingBar';

/**
 * A slim indeterminate bar pinned to the very top of the viewport, shown
 * whenever any API request is in flight (NProgress-style).
 */
export default function GlobalLoadingBar() {
  const [active, setActive] = useState(false);
  useEffect(() => subscribeLoading(setActive), []);

  return (
    <Fade in={active} timeout={{ enter: 0, exit: 400 }} unmountOnExit>
      <LinearProgress
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          zIndex: (theme) => theme.zIndex.appBar + 2,
          '& .MuiLinearProgress-bar': { transition: 'transform 0.2s linear' },
        }}
      />
    </Fade>
  );
}
