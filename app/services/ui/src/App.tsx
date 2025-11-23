import './App.css';
import {BrowserRouter, Route, Routes} from "react-router-dom";
import {SignUp} from "./features/auth/SignUp.tsx";
import {SignIn} from "./features/auth/SignIn.tsx";
import {USER_LOGIN_ROUTE, USER_REGISTER_ROUTE} from "./config/routes.ts"

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path={USER_REGISTER_ROUTE} element={<SignUp />} />
        <Route path={USER_LOGIN_ROUTE} element={<SignIn />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App;
