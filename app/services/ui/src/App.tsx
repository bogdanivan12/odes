import './App.css';
import {BrowserRouter, Route, Routes} from "react-router-dom";
import {SignUp} from "./features/auth/SignUp.tsx";
import {SignIn} from "./features/auth/SignIn.tsx";
import {
  HOME_ROUTE,
  USER_LOGIN_ROUTE,
  USER_REGISTER_ROUTE,
  INSTITUTIONS_ROUTE,
  INSTITUTIONS_CREATE_ROUTE,
} from "./config/routes.ts";
import { Home } from "./features/home/Home.tsx";
import RequireAuth from './features/auth/RequireAuth';
import MainLayout from './features/layout/MainLayout';
import Institutions from './features/institutions/Institutions';
import CreateInstitution from './features/institutions/CreateInstitution';

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
          <Route path={INSTITUTIONS_ROUTE} element={<Institutions />} />
          <Route path={INSTITUTIONS_CREATE_ROUTE} element={<CreateInstitution />} />
          {/* Other protected routes can be nested here and will inherit the layout */}
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App;
