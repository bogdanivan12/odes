// import ResponsiveAppBar from "../navbar/ResponsiveAppBar.tsx";
import Toolbar from '@mui/material/Toolbar';

export function Home() {
  return (
    <>
      {/*<ResponsiveAppBar />*/}
      {/* spacer to offset the fixed AppBar height */}
      <Toolbar />
      <main>
        {/* page content goes here */}
      </main>
    </>
  )
}