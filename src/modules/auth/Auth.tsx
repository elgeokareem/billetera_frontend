import { Link, Outlet } from "@tanstack/react-router";
import { useEffect } from "react";

export default function Auth() {
  // TODO: Find a way to get the current route to make a redirect
  // return <Navigate to="/posts/$postId" params={{ postId: 'my-first-post' }} />

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
