import { useState } from "react";

export default function Register() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  return (
    <form action="" className="mt-10">
      <label htmlFor="username" className="block">
        Username
      </label>
      <input
        type="text"
        value={username}
        onChange={e => setUsername(e.target.value)}
        id="username"
        placeholder="Username"
        className="block border-1 shadow rounded-md h-12 px-2 mb-5 w-full"
      />

      <label htmlFor="password" className="block">
        Password
      </label>
      <input
        type="password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        placeholder="Password"
        className="block border-1 shadow rounded-md h-12 px-2 mb-5 w-full"
      />

      <label htmlFor="password" className="block">
        Confirm Password
      </label>
      <input
        type="password"
        value={confirmPassword}
        onChange={e => setConfirmPassword(e.target.value)}
        placeholder="Password"
        className="block border-1 shadow rounded-md h-12 px-2 mb-5 w-full"
      />

      <div className="flex justify-around">
        <button
          type="submit"
          className="bg-blue-600 py-4 px-6 rounded-xl text-slate-100 font-bold"
        >
          Register
        </button>
      </div>
    </form>
  );
}
