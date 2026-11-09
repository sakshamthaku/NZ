import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import PublicLayout from "./layouts/PublicLayout";

import Home from "./pages/public/Home";
import About from "./pages/public/About";
import Contact from "./pages/public/Contact";
import Login from "./pages/public/Login";
import Signup from "./pages/public/Signup";
import NoteEditor from "./pages/public/NoteEditor";
import Chat from "./pages/public/Chat";
import Notes from "./pages/public/Note";
import CalendarComponent from "./pages/public/Calendar";
import Task from "./pages/public/Task";
import ExploreFuture from "./pages/public/ExploreFuture";

import Dashboard from "./pages/admin/Dashboard";
import AdminLayout from "./layouts/AdminLayout";
import ProtectedAdminRoute from "./components/ProtectedAdminRoute";
import Planning from "./pages/public/Planning";
import Join from "./pages/public/Join";
import DonationBox from "./pages/public/DonationBox";
import Connect from "./features/connect/Connect";
import NoteS from "./features/connect/NoteS";
import WORKPLACE from "./pages/public/Workspace";

import Echest1 from "./pages/price/Echest1";
import Echest2 from "./pages/price/Echest2";
import Shop from "./pages/price/Shop";
import Policy from "./pages/public/Policy";
import Group from "./public shared social/Group";
import Mainmenu from "./public shared social/Mainmenu";
import Usereditor from "./public shared social/Usereditor";
import Hosteditor from "./public shared social/Hostusereditor";
import CodePreview from "./pages/public/Code@preview";
import List from "./pages/public/List";
import Saved from "./pages/public/Saved";
import AISummary from "./pages/public/AISummary";







function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <ToastContainer position="top-center" autoClose={2000} />

      <Routes>
        {/* Public Routes */}
        <Route element={<PublicLayout />}>
          <Route index element={<Home />} />

          <Route path="about" element={<About />} />
          <Route path="contact" element={<Contact />} />
          
         

         
          <Route path="note" element={<Notes />} />
          <Route path="calender" element={<CalendarComponent />} />
          <Route path="task" element={<Task />} />
          <Route path="dash" element={<Dashboard />} />
          <Route path="D" element={<ExploreFuture />} />
        <Route path="/Planning"  element={<Planning/>} />
       
        <Route path="/join"       element={<Join/>} />
        <Route path="/list"       element={<List/>} />
        <Route path="/do"        element={<DonationBox/>} />
        <Route path="/connect"  element={<Connect/>}/>
        <Route path="connect"   element={<NoteS/>}/>
        <Route path="/WORKS"    element={<WORKPLACE />} />

          {/* AI Summary */}
          <Route path="ai" element={<AISummary />} />

          {/* Edit existing note */}
          <Route
            path="notes/edit/:noteId"
            element={<NoteEditor />}
          />

          {/* Note writer */}
          <Route
            path="notewriter"
            element={<NoteEditor />}
          />

          <Route
            path="notewriter/:id"
            element={<NoteEditor />}
          />
        </Route>

        {/* Admin Routes */}
        <Route element={<AdminLayout />}>
          <Route
            path="/dashboard"
            element={
              <ProtectedAdminRoute>
                <Dashboard />
              </ProtectedAdminRoute>
            }
          />
        </Route>

      <Route path="login" element={<Login />} />
       <Route path="signup" element={<Signup />} />
       
       <Route path="Echest" element={<Echest1/>}/>
       <Route path="E2"     element={<Echest2/>}/>
       <Route path="SHOPING" element={<Shop/>}/>
        <Route path="chat" element={<Chat />} />
        <Route path="POLICY" element={<Policy/>}/>
        <Route path="so"   element={<Group/>} />
        <Route path="/MENU" element={<Mainmenu/>}/>
        <Route path="/USERINTERFACED" element={<Usereditor/>}/>
        <Route path="/hostenterfaced" element={<Hosteditor/>}/>
        <Route path="/codesee"     element={<CodePreview/>}/>
        <Route path="/savedlist"   element={<Saved/>}/>
        <Route path="/AI"          element={<AISummary/>}/>
      </Routes>
      
    </BrowserRouter>
    
  );
}

export default App;