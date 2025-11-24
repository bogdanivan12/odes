import './App.css';
import {BrowserRouter, Route, Routes} from "react-router-dom";
import {SignUp} from "./features/auth/SignUp.tsx";
import {SignIn} from "./features/auth/SignIn.tsx";
import {
  HOME_ROUTE,
  USER_LOGIN_ROUTE,
  USER_REGISTER_ROUTE
} from "./config/routes.ts";
import { Home } from "./features/home/Home.tsx";
import RequireAuth from './features/auth/RequireAuth';
import MainLayout from './features/layout/MainLayout';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* public routes */}
        <Route path={USER_REGISTER_ROUTE} element={<SignUp />} />
        <Route path={USER_LOGIN_ROUTE} element={<SignIn />} />

        {/* protected routes - use MainLayout to show ResponsiveAppBar */}
        <Route element={<RequireAuth><MainLayout /></RequireAuth>}>
          <Route path={HOME_ROUTE} element={<Home />} />
          {/* Other protected routes can be nested here and will inherit the layout */}
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App;
