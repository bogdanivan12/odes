import './App.css';
import {BrowserRouter, Route, Routes} from "react-router-dom";
import {SignUp} from "./features/auth/SignUp.tsx";
import {SignIn} from "./features/auth/SignIn.tsx";
import {ForgotPassword} from "./features/auth/ForgotPassword.tsx";
import {ResetPassword} from "./features/auth/ResetPassword.tsx";
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
  INSTITUTION_REQUESTS_ROUTE,
  MY_SCHEDULE_ROUTE,
  SCHEDULE_VIEW_ROUTE,
  SCHEDULE_EDIT_ROUTE,
  INSTITUTION_ROUTE,
  INSTITUTIONS_ROUTE,
  INSTITUTIONS_CREATE_ROUTE,
  PROFILE_ROUTE,
  ROOM_ROUTE,
  USER_ROUTE,
  USER_LOGIN_ROUTE,
  USER_REGISTER_ROUTE,
  FORGOT_PASSWORD_ROUTE,
  RESET_PASSWORD_ROUTE,
  HELP_ROUTE,
} from "./config/routes.ts";
import GlobalStyles from "@mui/material/GlobalStyles";
import GlobalLoadingBar from "./components/GlobalLoadingBar";
import RootPage from "./features/home/RootPage.tsx";

// App-wide animation keyframes + an accessibility reset that disables motion
// for users who request it.
const globalAnimations = (
  <GlobalStyles
    styles={{
      // Guard against any stray element forcing horizontal scroll on phones.
      // (Wide content like the calendar grid has its own internal scroll.)
      html: { overflowX: 'hidden' },
      body: { overflowX: 'hidden', transition: 'background-color 0.3s ease, color 0.3s ease' },
      '@keyframes fadeInUp': {
        from: { opacity: 0, transform: 'translateY(8px)' },
        to: { opacity: 1, transform: 'none' },
      },
      '@keyframes odesFadeIn': {
        from: { opacity: 0 },
        to: { opacity: 1 },
      },
      '@media (prefers-reduced-motion: reduce)': {
        '*, *::before, *::after': {
          animationDuration: '0.001ms !important',
          animationIterationCount: '1 !important',
          transitionDuration: '0.001ms !important',
          scrollBehavior: 'auto !important',
        },
      },
    }}
  />
);
import GlobalMySchedulePage from "./features/home/GlobalMySchedulePage.tsx";
import RequireAuth from './features/auth/RequireAuth';
import MainLayout from './features/layout/MainLayout';
import Institutions from './features/institutions/Institutions';
import CreateInstitution from './features/institutions/CreateInstitution';
import InstitutionMainPage from './features/institutions/InstitutionMainPage';
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
import ScheduleEditPage from './features/schedules/ScheduleEditPage';
import MySchedulePage from './features/schedules/MySchedulePage';
import InstitutionRequests from './features/requests/InstitutionRequests';
import InstitutionMembers from './features/members/InstitutionMembers';
import MemberMainPage from './features/members/MemberMainPage';
import ProfilePage from './features/members/ProfilePage';
import HelpCenter from './features/help/HelpCenter';

function App() {
  return (
    <BrowserRouter>
      {globalAnimations}
      <GlobalLoadingBar />
      <Routes>
        {/* public routes */}
        <Route path={HOME_ROUTE} element={<RootPage />} />
        <Route path={USER_REGISTER_ROUTE} element={<SignUp />} />
        <Route path={USER_LOGIN_ROUTE} element={<SignIn />} />
        <Route path={FORGOT_PASSWORD_ROUTE} element={<ForgotPassword />} />
        <Route path={RESET_PASSWORD_ROUTE} element={<ResetPassword />} />

        {/* protected routes - use MainLayout to show ResponsiveAppBar */}
        <Route element={<RequireAuth><MainLayout /></RequireAuth>}>
          <Route path={INSTITUTIONS_ROUTE} element={<Institutions />} />
          <Route path={INSTITUTIONS_CREATE_ROUTE} element={<CreateInstitution />} />
          <Route path={INSTITUTION_ROUTE} element={<InstitutionMainPage />} />
          <Route path={INSTITUTION_MEMBERS_ROUTE} element={<InstitutionMembers />} />
          <Route path={INSTITUTION_GROUPS_ROUTE} element={<InstitutionGroups />} />
          <Route path={INSTITUTION_COURSES_ROUTE} element={<InstitutionCourses />} />
          <Route path={INSTITUTION_ROOMS_ROUTE} element={<InstitutionRooms />} />
          <Route path={INSTITUTION_ACTIVITIES_ROUTE} element={<InstitutionActivities />} />
          <Route path={INSTITUTION_SCHEDULES_ROUTE} element={<InstitutionSchedules />} />
          <Route path={MY_SCHEDULE_ROUTE} element={<GlobalMySchedulePage />} />
          <Route path={INSTITUTION_MY_SCHEDULE_ROUTE} element={<MySchedulePage />} />
          <Route path={INSTITUTION_REQUESTS_ROUTE} element={<InstitutionRequests />} />
          <Route path={SCHEDULE_VIEW_ROUTE} element={<ScheduleViewPage />} />
          <Route path={SCHEDULE_EDIT_ROUTE} element={<ScheduleEditPage />} />
          <Route path={COURSE_ROUTE} element={<CourseMainPage />} />
          <Route path={GROUP_ROUTE} element={<GroupMainPage />} />
          <Route path={ROOM_ROUTE} element={<RoomMainPage />} />
          <Route path={ACTIVITY_ROUTE} element={<ActivityMainPage />} />
          <Route path={PROFILE_ROUTE} element={<ProfilePage />} />
          <Route path={HELP_ROUTE} element={<HelpCenter />} />
          <Route path={USER_ROUTE} element={<MemberMainPage />} />
          {/* Other protected routes can be nested here and will inherit the layout */}
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App;
