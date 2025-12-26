import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import AgentChat from "./pages/AgentChat";
import History from "./pages/History";
import Pricing from "./pages/Pricing";
import Admin from "./pages/Admin";
import AdminAgents from "./pages/AdminAgents";

import WechatLogin from "./pages/WechatLogin";
import Payment from "./pages/Payment";
import PaymentResult from "./pages/PaymentResult";
import CaseExample from "./pages/CaseExample";
import EmailLogin from "./pages/EmailLogin";
import PasswordLogin from "./pages/PasswordLogin";
import Credits from "./pages/Credits";
import CreditUsage from "./pages/CreditUsage";
import UserManagement from "./pages/UserManagement";
import OrderManagement from "./pages/OrderManagement";
import SupportForm from "./pages/SupportForm";
import SupportFloatingButton from "./components/SupportFloatingButton";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import About from "./pages/About";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path="/agent/:id" component={AgentChat} />
      <Route path="/conversation/:id" component={AgentChat} />
      <Route path="/history" component={History} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/admin" component={Admin} />
      <Route path="/admin/agents" component={AdminAgents} />

      <Route path="/wechat-login" component={WechatLogin} />
      <Route path="/wechat-callback" component={WechatLogin} />
      <Route path="/email-login" component={EmailLogin} />
      {/* <Route path="/login" component={PasswordLogin} /> */}
      <Route path="/payment/:plan" component={Payment} />
      <Route path="/payment/result" component={PaymentResult} />
      <Route path="/case-example" component={CaseExample} />
      <Route path="/credits" component={Credits} />
      <Route path="/credit-usage" component={CreditUsage} />
      <Route path="/usage" component={CreditUsage} />
      <Route path="/admin/user-management" component={UserManagement} />
      <Route path="/admin/orders" component={OrderManagement} />
      <Route path="/support" component={SupportForm} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/about" component={About} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          <Router />
          <SupportFloatingButton />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
