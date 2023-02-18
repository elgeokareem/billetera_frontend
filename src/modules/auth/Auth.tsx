import { Link, Outlet, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import { authRoute } from "../../routes/routeAuth";

export default function Auth() {
  const router = useRouter();
  const navigate = useNavigate();

  useEffect(() => {
    if (router.state.currentLocation.pathname === authRoute.fullPath) {
      navigate({
        to: "/auth/login"
      });
    }
  }, []);

  return (
    <div className="w-1/3 h-[500px] rounded-lg border-2 border-cyan-500 p-4 flex flex-col align-top mt-10">
      <h1 className="self-center">Auth</h1>
      <div className="self-center w-full flex justify-center gap-11">
        <Link to="/auth/login">Login</Link>
        <Link to="/auth/register">Register</Link>
      </div>

      <Outlet />
    </div>
  );
}
