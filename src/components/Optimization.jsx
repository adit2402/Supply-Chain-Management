import { useState, useEffect } from 'react'
import { Card, Row, Col, Form, Button, Alert, Spinner } from 'react-bootstrap'
import { predictManufacturingCost, findOptimalProductionVolume } from '../utils/modelLoader'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, BarElement } from 'chart.js'
import { Line, Bar } from 'react-chartjs-2'

// Register ChartJS components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend)

const Optimization = () => {
  const [productionVolume, setProductionVolume] = useState(500)
  const [minVolume, setMinVolume] = useState(100)
  const [maxVolume, setMaxVolume] = useState(1000)
  const [stepSize, setStepSize] = useState(50)
  const [costTarget, setCostTarget] = useState('overall')
  const [costReductionTarget, setCostReductionTarget] = useState(15)
  
  const [predictedCost, setPredictedCost] = useState(null)
  const [optimalVolume, setOptimalVolume] = useState(null)
  const [costChartData, setCostChartData] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [optimizationDone, setOptimizationDone] = useState(false)
  const [error, setError] = useState(null)

  // Function to predict manufacturing cost based on production volume
  const predictCost = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const cost = await predictManufacturingCost(productionVolume)
      setPredictedCost(cost)
      setIsLoading(false)
    } catch (err) {
      console.error('Error predicting cost:', err)
      setError('Error predicting manufacturing cost: ' + err.message)
      setIsLoading(false)
    }
  }

  // Function to find the optimal production volume
  const runOptimization = async () => {
    setIsLoading(true)
    setError(null)
    setOptimizationDone(false)
    
    try {
      // Find optimal volume
      const { volume, cost } = await findOptimalProductionVolume(minVolume, maxVolume, stepSize)
      setOptimalVolume({ volume, cost })
      
      // Generate data for cost curve visualization
      const labels = []
      const costs = []
      
      for (let vol = minVolume; vol <= maxVolume; vol += stepSize) {
        labels.push(vol)
        const costAtVolume = await predictManufacturingCost(vol)
        costs.push(costAtVolume)
      }
      
      setCostChartData({
        labels,
        datasets: [
          {
            label: 'Manufacturing Cost',
            data: costs,
            borderColor: 'rgb(255, 99, 132)',
            backgroundColor: 'rgba(255, 99, 132, 0.5)',
            tension: 0.3,
          }
        ],
      })
      
      setIsLoading(false)
      setOptimizationDone(true)
    } catch (err) {
      console.error('Error during optimization:', err)
      setError('Error during optimization: ' + err.message)
      setIsLoading(false)
    }
  }
  
  return (
    <div className="optimization-container">
      <Alert variant="info" className="mb-4">
        The cost optimization module helps identify the optimal production volume to minimize manufacturing costs in your supply chain.
      </Alert>

      <Row>
        <Col md={4}>
          <Card className="mb-4">
            <Card.Body>
              <Card.Title>Production Volume Optimization</Card.Title>
              <Form>
                <Form.Group className="mb-3">
                  <Form.Label>Current Production Volume</Form.Label>
                  <Form.Control 
                    type="number" 
                    value={productionVolume}
                    onChange={(e) => setProductionVolume(Number(e.target.value))}
                    min={0}
                    max={2000}
                  />
                </Form.Group>
                
                <Button 
                  variant="outline-primary" 
                  onClick={predictCost}
                  disabled={isLoading}
                  className="mb-3 me-2"
                >
                  Calculate Cost
                </Button>
                
                {predictedCost !== null && (
                  <div className="alert alert-info mb-3">
                    <strong>Predicted Manufacturing Cost:</strong> ${predictedCost.toFixed(2)}
                  </div>
                )}
                
                <hr />
                
                <h6>Optimization Parameters</h6>
                
                <Form.Group className="mb-2">
                  <Form.Label>Minimum Volume</Form.Label>
                  <Form.Control 
                    type="number" 
                    value={minVolume}
                    onChange={(e) => setMinVolume(Number(e.target.value))}
                    min={0}
                  />
                </Form.Group>
                
                <Form.Group className="mb-2">
                  <Form.Label>Maximum Volume</Form.Label>
                  <Form.Control 
                    type="number" 
                    value={maxVolume}
                    onChange={(e) => setMaxVolume(Number(e.target.value))}
                    min={minVolume}
                  />
                </Form.Group>
                
                <Form.Group className="mb-3">
                  <Form.Label>Step Size</Form.Label>
                  <Form.Control 
                    type="number" 
                    value={stepSize}
                    onChange={(e) => setStepSize(Number(e.target.value))}
                    min={1}
                  />
                </Form.Group>
                
                <Button 
                  variant="primary" 
                  onClick={runOptimization}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
                      <span className="ms-2">Optimizing...</span>
                    </>
                  ) : 'Find Optimal Volume'}
                </Button>
                
                {error && (
                  <Alert variant="danger" className="mt-3">
                    {error}
                  </Alert>
                )}
              </Form>
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={8}>
          <Card className="mb-4">
            <Card.Body>
              <Card.Title>Cost Optimization Results</Card.Title>
              {isLoading ? (
                <div className="text-center p-5">
                  <Spinner animation="border" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </Spinner>
                  <p className="mt-3">Computing optimal production volume...</p>
                </div>
              ) : costChartData ? (
                <div className="chart-container mb-4">
                  <Line 
                    data={costChartData}
                    options={{
                      responsive: true,
                      plugins: {
                        legend: {
                          position: 'top',
                        },
                        title: {
                          display: true,
                          text: 'Manufacturing Cost vs Production Volume',
                        },
                      },
                      scales: {
                        x: {
                          title: {
                            display: true,
                            text: 'Production Volume'
                          }
                        },
                        y: {
                          title: {
                            display: true,
                            text: 'Manufacturing Cost ($)'
                          }
                        }
                      }
                    }}
                  />
                </div>
              ) : (
                <div className="chart-placeholder p-5 bg-light text-center">
                  <p>Cost optimization visualization will appear here</p>
                  <p className="text-muted">Click "Find Optimal Volume" to run the optimization</p>
                </div>
              )}
              
              {optimizationDone && optimalVolume && (
                <div className="alert alert-success">
                  <h5>Optimization Results</h5>
                  <p><strong>Optimal Production Volume:</strong> {optimalVolume.volume} units</p>
                  <p><strong>Minimum Manufacturing Cost:</strong> ${optimalVolume.cost.toFixed(2)}</p>
                  <hr />
                  <p className="mb-0">
                    <small>The neural network model has identified the production volume that minimizes manufacturing costs based on historical data patterns.</small>
                  </p>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default Optimization