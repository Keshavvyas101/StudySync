import { Routes, Route } from "react-router-dom";

import PublicLayout from "./app/layout/PublicLayout";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import NotFound from "./pages/NotFound";

import WorkspaceLayout from "./app/layout/WorkspaceLayout";
import ProtectedRoute from "./components/Protected_Route";

const App = () => {
  return (
    <Routes>
      {/* PUBLIC AREA */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Route>

      {/* PROTECTED APP */}
      <Route
        path="/app/*"
        element={
          <ProtectedRoute>
            <WorkspaceLayout />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default App;
