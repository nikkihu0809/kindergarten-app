import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";
import Home from "./pages/Home";
import CurriculumPage from "./pages/CurriculumPage";
import AttendancePage from "./pages/AttendancePage";
import TeacherLeavePage from "./pages/TeacherLeavePage";
import ParentCommPage from "./pages/ParentCommPage";
import StudentsPage from "./pages/StudentsPage";
import TeachersPage from "./pages/TeachersPage";

import IncidentPage from "./pages/IncidentPage";
import StatPage from "./pages/StatPage";
import GrowthPage from "./pages/GrowthPage";

import StudentProfilePage from "./pages/StudentProfilePage";
import MeetingPage from "./pages/MeetingPage";
import AllowedEmailsPage from "./pages/AllowedEmailsPage";
import LoginLogsPage from "./pages/LoginLogsPage";
import LoginPage from "./pages/LoginPage";

function Router() {
  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      <Route>
        {() => (
    <DashboardLayout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/curriculum" component={CurriculumPage} />
        <Route path="/attendance" component={AttendancePage} />
        <Route path="/teacher-leave" component={TeacherLeavePage} />
        <Route path="/parent-comm" component={ParentCommPage} />
        <Route path="/students" component={StudentsPage} />
        <Route path="/teachers" component={TeachersPage} />

        <Route path="/incidents" component={IncidentPage} />
        <Route path="/stats" component={StatPage} />
        <Route path="/growth" component={GrowthPage} />

        <Route path="/meetings" component={MeetingPage} />
        <Route path="/student/:id" component={StudentProfilePage} />
        <Route path="/allowed-emails" component={AllowedEmailsPage} />
        <Route path="/login-logs" component={LoginLogsPage} />
        <Route component={NotFound} />
      </Switch>
    </DashboardLayout>
        )}
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
