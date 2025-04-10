import { useState, useEffect } from 'react'
import { Card, Row, Col, Button, Alert, Spinner, Table, Badge, ProgressBar } from 'react-bootstrap'
import { predictDemand, loadCostOptimizationModel, findOptimalProductionVolume } from '../utils/modelLoader'

const Dashboard = () => {
  // State for model status and insights
  const [modelStatus, setModelStatus] = useState({
    modelsLoaded: false,
    loadingModels: true,
    error: null
  })
  
  // State for model insights
  const [insights, setInsights] = useState({
    demandForecast: null,
    costOptimization: null
  })
  
  // Default inventory distribution data
  const [inventoryData, setInventoryData] = useState([
    { warehouse: 'North Distribution Center', stock: 1250, capacity: 2000, category: 'Raw Materials' },
    { warehouse: 'South Distribution Center', stock: 860, capacity: 1500, category: 'Finished Goods' },
    { warehouse: 'East Regional Warehouse', stock: 540, capacity: 800, category: 'Packaging Materials' },
    { warehouse: 'West Regional Warehouse', stock: 920, capacity: 1200, category: 'Finished Goods' },
    { warehouse: 'Central Storage Facility', stock: 1680, capacity: 2500, category: 'Raw Materials' }
  ])
  
  // Default shipping status data
  const [shippingData, setShippingData] = useState([
    { id: 'SHP-1289', destination: 'Boston, MA', status: 'Delivered', departure: '2025-04-08', arrival: '2025-04-10' },
    { id: 'SHP-1290', destination: 'Chicago, IL', status: 'In Transit', departure: '2025-04-09', arrival: '2025-04-12' },
    { id: 'SHP-1291', destination: 'Seattle, WA', status: 'Processing', departure: '2025-04-11', arrival: '2025-04-15' },
    { id: 'SHP-1292', destination: 'Miami, FL', status: 'Delayed', departure: '2025-04-07', arrival: '2025-04-13' },
    { id: 'SHP-1293', destination: 'Austin, TX', status: 'On Schedule', departure: '2025-04-10', arrival: '2025-04-13' }
  ])
  
  // Load models and generate initial insights on component mount
  useEffect(() => {
    async function loadModelsAndGenerateInsights() {
      try {
        // Attempt to load cost optimization model
        const costModel = await loadCostOptimizationModel()
        
        // Generate some sample insights
        const sampleDemandFeatures = {
          price: 50,
          availability: 90,
          stockLevels: 75,
          leadTimes: 5,
          orderQuantities: 40
        }
        
        // Get demand forecast for sample features
        const predictedDemand = predictDemand(sampleDemandFeatures)
        
        // Find optimal production volume
        const optimalProduction = await findOptimalProductionVolume(100, 1000, 100)
        
        // Update insights
        setInsights({
          demandForecast: {
            prediction: predictedDemand,
            features: sampleDemandFeatures
          },
          costOptimization: optimalProduction
        })
        
        // Update model status
        setModelStatus({
          modelsLoaded: true,
          loadingModels: false,
          error: null
        })
      } catch (err) {
        console.error('Error loading models:', err)
        setModelStatus({
          modelsLoaded: false,
          loadingModels: false,
          error: 'Failed to load ML models. Please check the console for details.'
        })
      }
    }
    
    loadModelsAndGenerateInsights()
  }, [])

  // Helper function to determine status badge variant
  const getStatusBadgeVariant = (status) => {
    switch(status) {
      case 'Delivered': return 'success';
      case 'In Transit': return 'primary';
      case 'Processing': return 'info';
      case 'Delayed': return 'warning';
      case 'On Schedule': return 'secondary';
      default: return 'secondary';
    }
  }

  // Helper function to calculate inventory usage percentage
  const calculateUsagePercentage = (stock, capacity) => {
    return Math.round((stock / capacity) * 100);
  }

  // Helper function to determine progress bar variant based on usage
  const getProgressBarVariant = (percentage) => {
    if (percentage < 30) return 'info';
    if (percentage < 60) return 'success';
    if (percentage < 85) return 'warning';
    return 'danger';
  }

  return (
    <div className="dashboard-overview">
      <Alert variant="info" className="mb-4">
        Welcome to the Supply Chain Management Dashboard! This overview shows machine learning models and data insights for your supply chain.
      </Alert>

      {/* ML Model Status Section */}
      <Row className="mb-4">
        <Col>
          <Card>
            <Card.Body>
              <Card.Title>ML Models Status</Card.Title>
              {modelStatus.loadingModels ? (
                <div className="text-center p-3">
                  <Spinner animation="border" role="status" variant="primary" />
                  <p className="mt-2">Loading machine learning models...</p>
                </div>
              ) : modelStatus.error ? (
                <Alert variant="danger">
                  {modelStatus.error}
                </Alert>
              ) : (
                <div className="row">
                  <div className="col-md-6">
                    <Alert variant="success">
                      Demand Forecasting Model Loaded
                    </Alert>
                    
                    {insights.demandForecast && (
                      <div className="mt-3 p-3 border rounded">
                        <h6>Sample Demand Forecast</h6>
                        <p>For a product with price ${insights.demandForecast.features.price} and availability {insights.demandForecast.features.availability}%:</p>
                        <h4 className="text-primary">{insights.demandForecast.prediction} units</h4>
                        <small className="text-muted">Predicted demand based on current settings</small>
                        <div className="mt-2">
                          <Button 
                            variant="outline-primary" 
                            size="sm"
                            onClick={() => window.dispatchEvent(new CustomEvent('navigate-tab', { detail: 'forecasting' }))}
                          >
                            Go to Forecasting
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="col-md-6">
                    <Alert variant="success">
                      Cost Optimization Model Loaded
                    </Alert>
                    
                    {insights.costOptimization && (
                      <div className="mt-3 p-3 border rounded">
                        <h6>Optimal Production Volume</h6>
                        <p>To minimize manufacturing costs:</p>
                        <h4 className="text-primary">{insights.costOptimization.volume} units</h4>
                        <p className="text-success">Est. Cost: ${insights.costOptimization.cost.toFixed(2)}</p>
                        <div className="mt-2">
                          <Button 
                            variant="outline-primary" 
                            size="sm"
                            onClick={() => window.dispatchEvent(new CustomEvent('navigate-tab', { detail: 'optimization' }))}
                          >
                            Go to Optimization
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Data Analysis Section */}
      <Row className="mb-4">
        <Col>
          <Card>
            <Card.Body>
              <Card.Title>Data Analysis</Card.Title>
              <div className="p-3">
                <p>Upload your supply chain data for analysis and forecasting</p>
                <div className="d-flex justify-content-center gap-3">
                  <Button 
                    variant="primary"
                    onClick={() => window.dispatchEvent(new CustomEvent('navigate-tab', { detail: 'eda' }))}
                  >
                    Explore & Analyze Data
                  </Button>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row>
        <Col md={6} className="mb-3">
          <Card>
            <Card.Body>
              <Card.Title>Inventory Distribution</Card.Title>
              <div className="inventory-table">
                <Table striped hover responsive>
                  <thead>
                    <tr>
                      <th>Warehouse</th>
                      <th>Category</th>
                      <th>Stock Level</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventoryData.map((item, index) => (
                      <tr key={index}>
                        <td>{item.warehouse}</td>
                        <td>{item.category}</td>
                        <td>
                          <div className="d-flex justify-content-between align-items-center mb-1">
                            <span>{item.stock}/{item.capacity}</span>
                            <small>{calculateUsagePercentage(item.stock, item.capacity)}%</small>
                          </div>
                          <ProgressBar 
                            variant={getProgressBarVariant(calculateUsagePercentage(item.stock, item.capacity))}
                            now={calculateUsagePercentage(item.stock, item.capacity)} 
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
              <div className="mt-3 text-end">
                <Button size="sm" variant="outline-primary">View Full Inventory Report</Button>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={6} className="mb-3">
          <Card>
            <Card.Body>
              <Card.Title>Shipping Status</Card.Title>
              <div className="shipping-table">
                <Table striped hover responsive>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Destination</th>
                      <th>Status</th>
                      <th>Est. Arrival</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shippingData.map((shipment, index) => (
                      <tr key={index}>
                        <td>{shipment.id}</td>
                        <td>{shipment.destination}</td>
                        <td>
                          <Badge bg={getStatusBadgeVariant(shipment.status)}>
                            {shipment.status}
                          </Badge>
                        </td>
                        <td>
                          {new Date(shipment.arrival).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
              <div className="mt-3 text-end">
                <Button size="sm" variant="outline-primary">View All Shipments</Button>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default Dashboard