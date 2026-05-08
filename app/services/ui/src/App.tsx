import './App.css';
import {BrowserRouter, Route, Routes} from "react-router-dom";
import {SignUp} from "./features/auth/SignUp.tsx";
import {SignIn} from "./features/auth/SignIn.tsx";
import {
  ACTIVITY_ROUTE,
  COURSE_ROUTE,
  GROUP_ROUTE,
  HOME_ROUTE,
  INSTITUTION_ACTIVITIES_ROUTE,
  INSTITUTION_COURSES_ROUTE,
  INSTITUTION_GROUPS_ROUTE,
  INSTITUTION_MEMBERS_ROUTE,
  INSTITUTION_ROOMS_ROUTE,
  INSTITUTION_SCHEDULES_ROUTE,
  INSTITUTION_MY_SCHEDULE_ROUTE,
  MY_SCHEDULE_ROUTE,
  SCHEDULE_VIEW_ROUTE,
  INSTITUTION_ROUTE,
  INSTITUTION_UPDATE_ROUTE,
  INSTITUTIONS_ROUTE,
  INSTITUTIONS_CREATE_ROUTE,
  PROFILE_ROUTE,
  ROOM_ROUTE,
  USER_ROUTE,
  USER_UPDATE_ROUTE,
  USER_LOGIN_ROUTE,
  USER_REGISTER_ROUTE,
} from "./config/routes.ts";
import RootPage from "./features/home/RootPage.tsx";
import GlobalMySchedulePage from "./features/home/GlobalMySchedulePage.tsx";
import RequireAuth from './features/auth/RequireAuth';
import MainLayout from './features/layout/MainLayout';
import Institutions from './features/institutions/Institutions';
import CreateInstitution from './features/institutions/CreateInstitution';
import InstitutionMainPage from './features/institutions/InstitutionMainPage';
import UpdateInstitution from './features/institutions/UpdateInstitution';
import InstitutionCourses from './features/courses/InstitutionCourses';
import CourseMainPage from './features/courses/CourseMainPage';
import InstitutionGroups from './features/groups/InstitutionGroups';
import GroupMainPage from './features/groups/GroupMainPage';
import InstitutionRooms from './features/rooms/InstitutionRooms';
import RoomMainPage from './features/rooms/RoomMainPage';
import InstitutionActivities from './features/activities/InstitutionActivities';
import ActivityMainPage from './features/activities/ActivityMainPage';
import InstitutionSchedules from './features/schedules/InstitutionSchedules';
import ScheduleViewPage from './features/schedules/ScheduleViewPage';
import MySchedulePage from './features/schedules/MySchedulePage';
import InstitutionMembers from './features/members/InstitutionMembers';
import MemberMainPage from './features/members/MemberMainPage';
import UpdateMemberRoles from './features/members/UpdateMemberRoles';
import ProfilePage from './features/members/ProfilePage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* public routes */}
        <Route path={HOME_ROUTE} element={<RootPage />} />
        <Route path={USER_REGISTER_ROUTE} element={<SignUp />} />
        <Route path={USER_LOGIN_ROUTE} element={<SignIn />} />

        {/* protected routes - use MainLayout to show ResponsiveAppBar */}
        <Route element={<RequireAuth><MainLayout /></RequireAuth>}>
          <Route path={INSTITUTIONS_ROUTE} element={<Institutions />} />
          <Route path={INSTITUTIONS_CREATE_ROUTE} element={<CreateInstitution />} />
          <Route path={INSTITUTION_UPDATE_ROUTE} element={<UpdateInstitution />} />
          <Route path={INSTITUTION_ROUTE} element={<InstitutionMainPage />} />
          <Route path={INSTITUTION_MEMBERS_ROUTE} element={<InstitutionMembers />} />
          <Route path={INSTITUTION_GROUPS_ROUTE} element={<InstitutionGroups />} />
          <Route path={INSTITUTION_COURSES_ROUTE} element={<InstitutionCourses />} />
          <Route path={INSTITUTION_ROOMS_ROUTE} element={<InstitutionRooms />} />
          <Route path={INSTITUTION_ACTIVITIES_ROUTE} element={<InstitutionActivities />} />
          <Route path={INSTITUTION_SCHEDULES_ROUTE} element={<InstitutionSchedules />} />
          <Route path={MY_SCHEDULE_ROUTE} element={<GlobalMySchedulePage />} />
          <Route path={INSTITUTION_MY_SCHEDULE_ROUTE} element={<MySchedulePage />} />
          <Route path={SCHEDULE_VIEW_ROUTE} element={<ScheduleViewPage />} />
          <Route path={COURSE_ROUTE} element={<CourseMainPage />} />
          <Route path={GROUP_ROUTE} element={<GroupMainPage />} />
          <Route path={ROOM_ROUTE} element={<RoomMainPage />} />
          <Route path={ACTIVITY_ROUTE} element={<ActivityMainPage />} />
          <Route path={PROFILE_ROUTE} element={<ProfilePage />} />
          <Route path={USER_ROUTE} element={<MemberMainPage />} />
          <Route path={USER_UPDATE_ROUTE} element={<UpdateMemberRoles />} />
          {/* Other protected routes can be nested here and will inherit the layout */}
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App;
