import { createRoot } from 'react-dom/client'
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import "react-toastify/dist/ReactToastify.css";
import './index.css'
import "./admin/styles/admin.css";
import "./public/styles/public-site.css";
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <App />,
)
