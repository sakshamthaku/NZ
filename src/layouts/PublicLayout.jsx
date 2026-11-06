import { Outlet } from "react-router-dom";
import Header from "../components/public/Header";
import Footer from "../components/public/Footer";
function PublicLayout() {
  return (
    <>
      <Header />
      <Outlet />
      <Footer />
    </>
  );
}


export default PublicLayout;