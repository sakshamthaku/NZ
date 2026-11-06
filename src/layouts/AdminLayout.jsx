import React from "react";
import { Outlet } from "react-router-dom";

import AdminHeader from "../components/admins/Adminheader";
import AdminFooter from "../components/admins/Adminfooter";

function AdminLayout() {
  return (
    <>
      <AdminHeader />

      <main>
        <Outlet />
      </main>

      <AdminFooter />
    </>
  );
}

export default AdminLayout;