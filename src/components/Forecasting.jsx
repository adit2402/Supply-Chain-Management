import { useState, useEffect } from 'react'
import { Card, Row, Col, Form, Button, Alert, Spinner } from 'react-bootstrap'
import { predictDemand } from '../utils/modelLoader'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js'
import { Line } from 'react-chartjs-2'

// Register ChartJS components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend)

const Forecasting = () => {
  const [forecastPeriod, setForecastPeriod] = useState(30)
  const [selectedModel, setSelectedModel] = useState('lightgbm')
  const [inputFeatures, setInputFeatures] = useState({
    price: 50,
    availability: 85,
    stockLevels: 65,
    leadTimes: 7,
    orderQuantities: 30
  })
  const [prediction, setPrediction] = useState(null)
  const [forecastData, setForecastData] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  // Handle input feature changes
  const handleFeatureChange = (feature, value) => {
    setInputFeatures({
      ...inputFeatures,
      [feature]: Number(value)
    })
  }

  // Generate forecast data based on current inputs
  const generateForecast = () => {
    setIsLoading(true)
    setError(null)
    
    try {
      // Get current prediction
      const currentPrediction = predictDemand(inputFeatures)
      setPrediction(currentPrediction)
      
      // Generate time series data for the chart with some randomization for realistic forecasting
      const labels = Array.from({ length: forecastPeriod }, (_, i) => `Day ${i + 1}`)
      const data = Array.from({ length: forecastPeriod }, (_, i) => {
        // Add some seasonality and randomness
        const trend = Math.sin(i / 7 * Math.PI) * 20 // Weekly seasonality
        const randomness = Math.random() * 30 - 15 // Random fluctuation
        return Math.max(0, Math.round(currentPrediction + trend + randomness))
      })
      
      setForecastData({
        labels,
        datasets: [
          {
            label: 'Forecasted Demand',
            data,
            borderColor: 'rgb(53, 162, 235)',
            backgroundColor: 'rgba(53, 162, 235, 0.5)',
          }
        ],
      })
      
      setIsLoading(false)
    } catch (err) {
      setError('Error generating forecast: ' + err.message)
      setIsLoading(false)
    }
  }
  
  return (
    <div className="forecasting-container">
      <Alert variant="info" className="mb-4">
        This module visualizes demand predictions based on historical data using the trained LightGBM model.
      </Alert>

      <Row className="mb-4">
        <Col md={4}>
          <Card>
            <Card.Body>
              <Card.Title>Forecast Settings</Card.Title>
              <Form>
                <Form.Group className="mb-3" controlId="forecastPeriod">
                  <Form.Label>Forecast Period (days)</Form.Label>
                  <Form.Control 
                    type="number" 
                    value={forecastPeriod}
                    onChange={(e) => setForecastPeriod(Number(e.target.value))} 
                    min={1}
                    max={365}
                  />
                </Form.Group>
                
                <Form.Group className="mb-3" controlId="forecastModel">
                  <Form.Label>Forecasting Model</Form.Label>
                  <Form.Select 
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                  >
                    <option value="lightgbm">LightGBM (Trained Model)</option>
                    <option value="arima" disabled>ARIMA</option>
                    <option value="prophet" disabled>Prophet</option>
                    <option value="lstm" disabled>LSTM Neural Network</option>
                  </Form.Select>
                </Form.Group>
                
                <hr />
                
                <h6>Input Features</h6>
                
                <Form.Group className="mb-2" controlId="price">
                  <Form.Label>Price</Form.Label>
                  <Form.Control 
                    type="number" 
                    value={inputFeatures.price}
                    onChange={(e) => handleFeatureChange('price', e.target.value)} 
                    min={1}
                  />
                </Form.Group>
                
                <Form.Group className="mb-2" controlId="availability">
                  <Form.Label>Availability (%)</Form.Label>
                  <Form.Control 
                    type="number" 
                    value={inputFeatures.availability}
                    onChange={(e) => handleFeatureChange('availability', e.target.value)} 
                    min={0}
                    max={100}
                  />
                </Form.Group>
                
                <Form.Group className="mb-2" controlId="stockLevels">
                  <Form.Label>Stock Levels</Form.Label>
                  <Form.Control 
                    type="number" 
                    value={inputFeatures.stockLevels}
                    onChange={(e) => handleFeatureChange('stockLevels', e.target.value)} 
                    min={0}
                  />
                </Form.Group>
                
                <Form.Group className="mb-2" controlId="leadTimes">
                  <Form.Label>Lead Times (days)</Form.Label>
                  <Form.Control 
                    type="number" 
                    value={inputFeatures.leadTimes}
                    onChange={(e) => handleFeatureChange('leadTimes', e.target.value)} 
                    min={1}
                  />
                </Form.Group>
                
                <Form.Group className="mb-3" controlId="orderQuantities">
                  <Form.Label>Order Quantities</Form.Label>
                  <Form.Control 
                    type="number" 
                    value={inputFeatures.orderQuantities}
                    onChange={(e) => handleFeatureChange('orderQuantities', e.target.value)} 
                    min={1}
                  />
                </Form.Group>
                
                <Button 
                  variant="primary" 
                  onClick={generateForecast}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
                      <span className="ms-2">Generating...</span>
                    </>
                  ) : 'Generate Forecast'}
                </Button>
              </Form>
              
              {error && (
                <Alert variant="danger" className="mt-3">
                  {error}
                </Alert>
              )}
            </Card.Body>
          </Card>
        </Col>
        <Col md={8}>
          <Card>
            <Card.Body>
              <Card.Title>Forecast Results</Card.Title>
              {isLoading ? (
                <div className="text-center p-5">
                  <Spinner animation="border" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </Spinner>
                  <p className="mt-3">Generating forecast...</p>
                </div>
              ) : forecastData ? (
                <div className="chart-container">
                  <Line 
                    data={forecastData}
                    options={{
                      responsive: true,
                      plugins: {
                        legend: {
                          position: 'top',
                        },
                        title: {
                          display: true,
                          text: `${forecastPeriod}-Day Demand Forecast`,
                        },
                      },
                    }}
                  />
                </div>
              ) : (
                <div className="chart-placeholder p-5 bg-light text-center">
                  <p>Adjust your inputs and click "Generate Forecast" to see predictions</p>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {prediction !== null && (
        <Row>
          <Col md={12}>
            <Card>
              <Card.Body>
                <Card.Title>Forecast Details</Card.Title>
                <div className="p-3">
                  <h5>Current Demand Prediction</h5>
                  <p className="lead">With the current feature values, the predicted demand is: <strong>{prediction} units</strong></p>
                  
                  <hr />
                  
                  <h6>Feature Importance:</h6>
                  <ul>
                    <li><strong>Price</strong>: Higher prices typically decrease demand</li>
                    <li><strong>Availability</strong>: Higher availability increases potential sales</li>
                    <li><strong>Stock Levels</strong>: Adequate stock is necessary to meet demand</li>
                    <li><strong>Lead Times</strong>: Shorter lead times lead to better customer satisfaction</li>
                    <li><strong>Order Quantities</strong>: Affects bulk ordering patterns</li>
                  </ul>
                  
                  <div className="alert alert-secondary">
                    <small>
                      Note: This forecast is based on a simplified version of the LightGBM model trained on historical data.
                      For more accurate predictions, consider retraining the model with more recent data.
                    </small>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}
    </div>
  )
}

export default Forecasting