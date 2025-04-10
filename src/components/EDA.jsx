import { useState, useRef } from 'react'
import { Card, Row, Col, Form, Button, Alert, Tabs, Tab, Spinner } from 'react-bootstrap'
import Papa from 'papaparse'
import { predictDemand } from '../utils/modelLoader'
import { Line, Bar } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend } from 'chart.js'

// Register ChartJS components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend)

const EDA = () => {
  // State for data upload and processing
  const [data, setData] = useState(null)
  const [columns, setColumns] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const fileInputRef = useRef(null)
  
  // State for visualization
  const [selectedChartType, setSelectedChartType] = useState('line')
  const [xAxisColumn, setXAxisColumn] = useState('')
  const [yAxisColumn, setYAxisColumn] = useState('')
  const [chartData, setChartData] = useState(null)
  
  // State for forecasting
  const [forecastResults, setForecastResults] = useState(null)
  const [isForecastLoading, setIsForecastLoading] = useState(false)
  const [forecastError, setForecastError] = useState('')
  const [forecastConfig, setForecastConfig] = useState({
    priceColumn: '',
    availabilityColumn: '',
    stockLevelsColumn: '',
    leadTimesColumn: '',
    orderQuantitiesColumn: '',
    forecastDays: 30
  })

  const handleFileUpload = (event) => {
    const file = event.target.files[0]
    if (!file) return

    // Reset states
    setError('')
    setLoading(true)
    setForecastResults(null)
    setChartData(null)
    setForecastError('')

    // Check file type
    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      setError('Please upload a CSV file')
      setLoading(false)
      return
    }

    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          setError(`Error parsing CSV: ${results.errors[0].message}`)
          console.error('CSV Parse errors:', results.errors)
          setLoading(false)
          return
        }
        
        // Set data and columns
        setData(results.data)
        setColumns(results.meta.fields || [])
        
        // Set default axis columns if available
        if (results.meta.fields && results.meta.fields.length > 0) {
          setXAxisColumn(results.meta.fields[0])
          if (results.meta.fields.length > 1) {
            setYAxisColumn(results.meta.fields[1])
          }
          
          // Try to guess forecast configuration columns based on names
          const guessColumn = (keywords, defaultCol = '') => {
            const found = results.meta.fields.find(col => 
              keywords.some(keyword => col.toLowerCase().includes(keyword.toLowerCase()))
            )
            return found || defaultCol
          }
          
          setForecastConfig({
            priceColumn: guessColumn(['price', 'cost']),
            availabilityColumn: guessColumn(['availability', 'avail']),
            stockLevelsColumn: guessColumn(['stock', 'inventory']),
            leadTimesColumn: guessColumn(['lead', 'time']),
            orderQuantitiesColumn: guessColumn(['order', 'quantity']),
            forecastDays: 30
          })
        }
        
        setLoading(false)
      },
      error: (error) => {
        setError(`Error parsing CSV: ${error.message}`)
        console.error('CSV error:', error)
        setLoading(false)
      }
    })
  }

  const resetData = () => {
    setData(null)
    setColumns([])
    setError('')
    setChartData(null)
    setForecastResults(null)
    setForecastError('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }
  
  const generateChart = () => {
    if (!data || !xAxisColumn || !yAxisColumn) return
    
    // Extract data for selected columns
    const labels = data.map(row => row[xAxisColumn])
    const values = data.map(row => row[yAxisColumn])
    
    // Create chart data
    const newChartData = {
      labels,
      datasets: [
        {
          label: yAxisColumn,
          data: values,
          backgroundColor: 'rgba(53, 162, 235, 0.5)',
          borderColor: 'rgb(53, 162, 235)',
          borderWidth: 1
        }
      ]
    }
    
    setChartData(newChartData)
  }
  
  const generateForecast = () => {
    if (!data) return
    
    setIsForecastLoading(true)
    setForecastError('')
    
    try {
      // Map column names to the features needed for forecast
      const featureMap = {
        price: forecastConfig.priceColumn,
        availability: forecastConfig.availabilityColumn,
        stockLevels: forecastConfig.stockLevelsColumn,
        leadTimes: forecastConfig.leadTimesColumn,
        orderQuantities: forecastConfig.orderQuantitiesColumn
      }
      
      // Check if we have all needed columns
      const missingColumns = Object.entries(featureMap)
        .filter(([_, column]) => !column)
        .map(([feature]) => feature)
      
      if (missingColumns.length > 0) {
        setForecastError(`Missing column mappings for: ${missingColumns.join(', ')}`)
        setIsForecastLoading(false)
        return
      }
      
      // Process each row and generate forecasts
      const forecasts = data.map((row, index) => {
        // Extract features from the row using the column mapping
        const features = {
          price: Number(row[featureMap.price]) || 0,
          availability: Number(row[featureMap.availability]) || 0,
          stockLevels: Number(row[featureMap.stockLevels]) || 0,
          leadTimes: Number(row[featureMap.leadTimes]) || 0,
          orderQuantities: Number(row[featureMap.orderQuantities]) || 0
        }
        
        // Generate prediction using the model
        const prediction = predictDemand(features)
        
        return {
          rowIndex: index,
          features,
          prediction
        }
      })
      
      // Create forecast chart data
      const labels = forecasts.map((_, index) => `Item ${index + 1}`)
      const predictions = forecasts.map(f => f.prediction)
      
      const forecastChartData = {
        labels,
        datasets: [
          {
            label: 'Predicted Demand',
            data: predictions,
            backgroundColor: 'rgba(75, 192, 192, 0.5)',
            borderColor: 'rgb(75, 192, 192)',
            borderWidth: 1
          }
        ]
      }
      
      setForecastResults({
        forecasts,
        chartData: forecastChartData,
        averageDemand: predictions.reduce((sum, val) => sum + val, 0) / predictions.length,
        maxDemand: Math.max(...predictions),
        minDemand: Math.min(...predictions)
      })
      
      setIsForecastLoading(false)
    } catch (err) {
      console.error('Forecast error:', err)
      setForecastError(`Error generating forecast: ${err.message}`)
      setIsForecastLoading(false)
    }
  }

  return (
    <div className="eda-container">
      <Alert variant="info" className="mb-4">
        Upload your supply chain data (CSV format) to explore, visualize patterns, and generate demand forecasts.
      </Alert>

      <Card className="mb-4">
        <Card.Body>
          <Card.Title>Data Upload</Card.Title>
          <Form.Group controlId="formFile" className="mb-3">
            <Form.Label>Upload CSV File</Form.Label>
            <Form.Control 
              type="file" 
              ref={fileInputRef}
              onChange={handleFileUpload} 
              accept=".csv"
              disabled={loading}
            />
            <Form.Text className="text-muted">
              Upload inventory, orders, or shipment data in CSV format
            </Form.Text>
          </Form.Group>

          {error && (
            <Alert variant="danger">{error}</Alert>
          )}

          {loading && (
            <Alert variant="warning">Processing file...</Alert>
          )}

          {data && (
            <div className="mt-3">
              <Alert variant="success">
                Successfully loaded {data.length} rows with {columns.length} columns
              </Alert>
              <Button variant="secondary" onClick={resetData}>
                Clear Data
              </Button>
            </div>
          )}
        </Card.Body>
      </Card>

      {data && (
        <Tabs defaultActiveKey="data-preview" className="mb-4">
          <Tab eventKey="data-preview" title="Data Preview">
            <Card>
              <Card.Body>
                <Card.Title>Data Preview</Card.Title>
                <div className="table-responsive">
                  <table className="table table-striped table-hover">
                    <thead>
                      <tr>
                        {columns.map((column, index) => (
                          <th key={index}>{column}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.slice(0, 10).map((row, rowIndex) => (
                        <tr key={rowIndex}>
                          {columns.map((column, colIndex) => (
                            <td key={colIndex}>{row[column]}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {data.length > 10 && (
                  <p className="text-muted">Showing 10 of {data.length} rows</p>
                )}
              </Card.Body>
            </Card>
          </Tab>
          
          <Tab eventKey="visualization" title="Visualization">
            <Card>
              <Card.Body>
                <Card.Title>Data Visualization</Card.Title>
                
                <Row className="mb-3">
                  <Col md={3}>
                    <Form.Group controlId="chartType">
                      <Form.Label>Chart Type</Form.Label>
                      <Form.Select
                        value={selectedChartType}
                        onChange={(e) => setSelectedChartType(e.target.value)}
                      >
                        <option value="line">Line Chart</option>
                        <option value="bar">Bar Chart</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  
                  <Col md={3}>
                    <Form.Group controlId="xAxisColumn">
                      <Form.Label>X-Axis Column</Form.Label>
                      <Form.Select
                        value={xAxisColumn}
                        onChange={(e) => setXAxisColumn(e.target.value)}
                      >
                        <option value="">Select Column</option>
                        {columns.map((column, index) => (
                          <option key={index} value={column}>{column}</option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  
                  <Col md={3}>
                    <Form.Group controlId="yAxisColumn">
                      <Form.Label>Y-Axis Column</Form.Label>
                      <Form.Select
                        value={yAxisColumn}
                        onChange={(e) => setYAxisColumn(e.target.value)}
                      >
                        <option value="">Select Column</option>
                        {columns.map((column, index) => (
                          <option key={index} value={column}>{column}</option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  
                  <Col md={3} className="d-flex align-items-end">
                    <Button 
                      variant="primary" 
                      onClick={generateChart}
                      disabled={!xAxisColumn || !yAxisColumn}
                      className="mb-3"
                    >
                      Generate Chart
                    </Button>
                  </Col>
                </Row>
                
                {chartData ? (
                  <div className="chart-container" style={{ height: '400px' }}>
                    {selectedChartType === 'line' ? (
                      <Line
                        data={chartData}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            title: {
                              display: true,
                              text: `${yAxisColumn} vs ${xAxisColumn}`
                            },
                            legend: {
                              position: 'top',
                            }
                          }
                        }}
                      />
                    ) : (
                      <Bar
                        data={chartData}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            title: {
                              display: true,
                              text: `${yAxisColumn} vs ${xAxisColumn}`
                            },
                            legend: {
                              position: 'top',
                            }
                          }
                        }}
                      />
                    )}
                  </div>
                ) : (
                  <div className="chart-placeholder p-5 bg-light text-center">
                    <p>Select columns and click "Generate Chart" to visualize your data</p>
                  </div>
                )}
              </Card.Body>
            </Card>
          </Tab>
          
          <Tab eventKey="forecast" title="Forecast">
            <Card>
              <Card.Body>
                <Card.Title>Demand Forecasting</Card.Title>
                <Alert variant="secondary">
                  Map your CSV columns to the required features for demand forecasting using our LightGBM model.
                </Alert>
                
                <Row className="mb-4">
                  <Col md={6}>
                    <Form>
                      <Form.Group className="mb-3" controlId="priceColumn">
                        <Form.Label>Price Column</Form.Label>
                        <Form.Select
                          value={forecastConfig.priceColumn}
                          onChange={(e) => setForecastConfig({...forecastConfig, priceColumn: e.target.value})}
                        >
                          <option value="">Select Column</option>
                          {columns.map((column, index) => (
                            <option key={index} value={column}>{column}</option>
                          ))}
                        </Form.Select>
                      </Form.Group>
                      
                      <Form.Group className="mb-3" controlId="availabilityColumn">
                        <Form.Label>Availability Column</Form.Label>
                        <Form.Select
                          value={forecastConfig.availabilityColumn}
                          onChange={(e) => setForecastConfig({...forecastConfig, availabilityColumn: e.target.value})}
                        >
                          <option value="">Select Column</option>
                          {columns.map((column, index) => (
                            <option key={index} value={column}>{column}</option>
                          ))}
                        </Form.Select>
                      </Form.Group>
                      
                      <Form.Group className="mb-3" controlId="stockLevelsColumn">
                        <Form.Label>Stock Levels Column</Form.Label>
                        <Form.Select
                          value={forecastConfig.stockLevelsColumn}
                          onChange={(e) => setForecastConfig({...forecastConfig, stockLevelsColumn: e.target.value})}
                        >
                          <option value="">Select Column</option>
                          {columns.map((column, index) => (
                            <option key={index} value={column}>{column}</option>
                          ))}
                        </Form.Select>
                      </Form.Group>
                    </Form>
                  </Col>
                  
                  <Col md={6}>
                    <Form>
                      <Form.Group className="mb-3" controlId="leadTimesColumn">
                        <Form.Label>Lead Times Column</Form.Label>
                        <Form.Select
                          value={forecastConfig.leadTimesColumn}
                          onChange={(e) => setForecastConfig({...forecastConfig, leadTimesColumn: e.target.value})}
                        >
                          <option value="">Select Column</option>
                          {columns.map((column, index) => (
                            <option key={index} value={column}>{column}</option>
                          ))}
                        </Form.Select>
                      </Form.Group>
                      
                      <Form.Group className="mb-3" controlId="orderQuantitiesColumn">
                        <Form.Label>Order Quantities Column</Form.Label>
                        <Form.Select
                          value={forecastConfig.orderQuantitiesColumn}
                          onChange={(e) => setForecastConfig({...forecastConfig, orderQuantitiesColumn: e.target.value})}
                        >
                          <option value="">Select Column</option>
                          {columns.map((column, index) => (
                            <option key={index} value={column}>{column}</option>
                          ))}
                        </Form.Select>
                      </Form.Group>
                      
                      <Form.Group className="mb-3" controlId="forecastDays">
                        <Form.Label>Forecast Period (days)</Form.Label>
                        <Form.Control
                          type="number"
                          value={forecastConfig.forecastDays}
                          onChange={(e) => setForecastConfig({...forecastConfig, forecastDays: Number(e.target.value)})}
                          min={1}
                          max={365}
                        />
                      </Form.Group>
                    </Form>
                  </Col>
                </Row>
                
                <div className="mb-4">
                  <Button 
                    variant="primary" 
                    onClick={generateForecast}
                    disabled={isForecastLoading}
                  >
                    {isForecastLoading ? (
                      <>
                        <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
                        <span className="ms-2">Generating Forecast...</span>
                      </>
                    ) : 'Generate Demand Forecast'}
                  </Button>
                </div>
                
                {forecastError && (
                  <Alert variant="danger" className="mb-4">
                    {forecastError}
                  </Alert>
                )}
                
                {forecastResults && (
                  <>
                    <Card className="mb-4">
                      <Card.Body>
                        <Card.Title>Forecast Results</Card.Title>
                        
                        <div className="row mb-4">
                          <div className="col-md-4">
                            <div className="card">
                              <div className="card-body text-center">
                                <h5 className="card-title">Average Demand</h5>
                                <h3 className="text-primary">
                                  {Math.round(forecastResults.averageDemand)} units
                                </h3>
                              </div>
                            </div>
                          </div>
                          
                          <div className="col-md-4">
                            <div className="card">
                              <div className="card-body text-center">
                                <h5 className="card-title">Maximum Demand</h5>
                                <h3 className="text-success">
                                  {forecastResults.maxDemand} units
                                </h3>
                              </div>
                            </div>
                          </div>
                          
                          <div className="col-md-4">
                            <div className="card">
                              <div className="card-body text-center">
                                <h5 className="card-title">Minimum Demand</h5>
                                <h3 className="text-danger">
                                  {forecastResults.minDemand} units
                                </h3>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="chart-container" style={{ height: '400px' }}>
                          <Bar
                            data={forecastResults.chartData}
                            options={{
                              responsive: true,
                              maintainAspectRatio: false,
                              plugins: {
                                title: {
                                  display: true,
                                  text: 'Predicted Demand by Item'
                                },
                                legend: {
                                  position: 'top',
                                }
                              }
                            }}
                          />
                        </div>
                      </Card.Body>
                    </Card>
                    
                    <Card>
                      <Card.Body>
                        <Card.Title>Detailed Forecast Data</Card.Title>
                        <div className="table-responsive">
                          <table className="table table-striped table-hover">
                            <thead>
                              <tr>
                                <th>Item</th>
                                <th>Price</th>
                                <th>Availability</th>
                                <th>Stock Levels</th>
                                <th>Lead Times</th>
                                <th>Order Quantities</th>
                                <th>Predicted Demand</th>
                              </tr>
                            </thead>
                            <tbody>
                              {forecastResults.forecasts.map((forecast, index) => (
                                <tr key={index}>
                                  <td>Item {index + 1}</td>
                                  <td>{forecast.features.price}</td>
                                  <td>{forecast.features.availability}</td>
                                  <td>{forecast.features.stockLevels}</td>
                                  <td>{forecast.features.leadTimes}</td>
                                  <td>{forecast.features.orderQuantities}</td>
                                  <td><strong>{forecast.prediction}</strong></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </Card.Body>
                    </Card>
                  </>
                )}
                
                {!forecastResults && !isForecastLoading && (
                  <div className="text-center p-5 bg-light rounded">
                    <p className="mb-0">Map your columns and click "Generate Demand Forecast" to predict demand</p>
                  </div>
                )}
              </Card.Body>
            </Card>
          </Tab>
        </Tabs>
      )}

      {!data && !loading && (
        <div className="text-center p-5 bg-light rounded">
          <p className="mb-0">Upload a CSV file to get started with data exploration and forecasting</p>
        </div>
      )}
    </div>
  )
}

export default EDA