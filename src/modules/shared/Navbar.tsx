import { Link } from "@tanstack/react-router";

export default function Navbar() {
  return (
    <nav className="bg-[#1f1f1f] h-14 flex justify-between items-center px-5 text-gray-100">
      <ul className="flex gap-4 cursor-pointer">
        <Link to="/">Home</Link>
        <Link to="/about">Blog</Link>
        <li>Algo mas</li>
        <li>Algo mas</li>
      </ul>

      <div className="flex gap-4">
        <Link to="/auth/login">Login</Link>
        <Link to="/auth/register">Register</Link>
      </div>
    </nav>
  );
}
