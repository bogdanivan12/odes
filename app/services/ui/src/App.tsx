import './App.css';
import {BrowserRouter, Route, Routes} from "react-router-dom";
import {SignUp} from "./features/auth/SignUp.tsx";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/signup" element={<SignUp />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App;
