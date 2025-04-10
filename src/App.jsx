import { useState, useEffect } from 'react'
import { Container, Nav, Tab, Row, Col } from 'react-bootstrap'
import './App.css'

// Component imports will be added here
import Dashboard from './components/Dashboard'
import EDA from './components/EDA'
import Forecasting from './components/Forecasting'
import Optimization from './components/Optimization'

function App() {
  const [activeTab, setActiveTab] = useState('dashboard')

  // Listen for custom navigation events
  useEffect(() => {
    const handleTabNavigation = (event) => {
      if (event.detail && ['dashboard', 'eda', 'forecasting', 'optimization'].includes(event.detail)) {
        setActiveTab(event.detail);
      }
    };

    window.addEventListener('navigate-tab', handleTabNavigation);
    
    return () => {
      window.removeEventListener('navigate-tab', handleTabNavigation);
    };
  }, []);

  return (
    <Container fluid className="dashboard-container">
      <h1 className="text-center mt-3 mb-4">Supply Chain Management Dashboard</h1>
      
      <Tab.Container id="dashboard-tabs" activeKey={activeTab} onSelect={(k) => setActiveTab(k)}>
        <Row>
          <Col sm={12}>
            <Nav variant="tabs" className="mb-3 justify-content-center">
              <Nav.Item>
                <Nav.Link eventKey="dashboard">Dashboard Overview</Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="eda">EDA</Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="forecasting">Forecasting</Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="optimization">Optimization</Nav.Link>
              </Nav.Item>
            </Nav>
          </Col>
        </Row>
        
        <Row>
          <Col sm={12}>
            <Tab.Content>
              <Tab.Pane eventKey="dashboard">
                <Dashboard />
              </Tab.Pane>
              <Tab.Pane eventKey="eda">
                <EDA />
              </Tab.Pane>
              <Tab.Pane eventKey="forecasting">
                <Forecasting />
              </Tab.Pane>
              <Tab.Pane eventKey="optimization">
                <Optimization />
              </Tab.Pane>
            </Tab.Content>
          </Col>
        </Row>
      </Tab.Container>
    </Container>
  )
}

export default App
