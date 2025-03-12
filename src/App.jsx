import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useNavigate, useParams } from 'react-router-dom';
import { Container, Flex, Box, Text, Heading, Link as RadixLink, Card, Badge, Avatar, Grid, Button, Strong, Code, Separator, TextArea, TextField, Select, Tabs, ScrollArea } from '@radix-ui/themes';

// Home page - now displays recent funds from the database
function Home() {
  const [funds, setFunds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchFunds() {
      try {
        console.log('Fetching funds...');
        const response = await fetch('/api/funds');
        console.log('Response status:', response.status);
        
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Funds data:', data);
        setFunds(data.slice(0, 3)); // Get only the first 3 funds
        setLoading(false);
      } catch (error) {
        console.error('Error fetching funds:', error);
        setError(error.message);
        setLoading(false);
      }
    }

    fetchFunds();
  }, []);

  return (
    <Container size="4">
      <Box mb="6">
        <Heading size="6" mb="2">Impact Fund Dashboard</Heading>
        <Text color="gray" mb="4">
          A platform for monitoring and analyzing the impact of investment funds across various sectors.
        </Text>
      </Box>
      <Box p="4" style={{ backgroundColor: 'var(--blue-2)', borderLeft: '4px solid var(--blue-9)' }}>
        <Heading size="4" mb="2">Dashboard Overview</Heading>
        <Text mb="3">
          This dashboard provides tools to track and analyze the impact of investment funds:
        </Text>
        <Box pl="5" mb="3" asChild>
          <ul style={{ listStyleType: 'disc' }}>
            <li><Text>View fund performance and impact metrics</Text></li>
            <li><Text>Analyze session data and insights</Text></li>
            <li><Text>Generate AI-powered impact analysis</Text></li>
            <li><Text>Track progress across multiple funds</Text></li>
            <li><Text>Identify trends and patterns in impact data</Text></li>
          </ul>
        </Box>
      </Box>
      
      <Heading size="5" mt="6" mb="4">Recent Funds</Heading>
      {error && (
        <Box p="4" style={{ backgroundColor: 'var(--red-2)', borderLeft: '4px solid var(--red-9)', marginBottom: '16px' }}>
          <Heading size="3" mb="2" color="red">Error</Heading>
          <Text>{error}</Text>
          <Text size="2" mt="2">Check the browser console for more details.</Text>
        </Box>
      )}
      {loading ? (
        <Text>Loading funds...</Text>
      ) : (
        <Grid columns={{ initial: '1', md: '3' }} gap="4">
          {funds.length > 0 ? (
            funds.map(fund => (
              <Card key={fund.id}>
                <Link to={`/funds/${fund.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <Flex direction="column" p="4">
                    <Heading size="4" mb="2">{fund.name}</Heading>
                    <Text color="gray" size="2" mb="3">{fund.description.substring(0, 100)}...</Text>
                    <Flex justify="between" align="center">
                      <Text size="2" color="gray">Programs: {fund.programCount}</Text>
                      <Text size="2" color="blue">${fund.totalAmount.toLocaleString()}</Text>
                    </Flex>
                  </Flex>
                </Link>
              </Card>
            ))
          ) : (
            <Text>No funds available.</Text>
          )}
        </Grid>
      )}
      
      <Flex justify="end" mt="4">
        <Link to="/funds">
          <Button variant="soft">View All Funds</Button>
        </Link>
      </Flex>
    </Container>
  );
}

// Funds component to display all funds
function Funds() {
  const [funds, setFunds] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchFunds() {
      try {
        const response = await fetch('/api/funds');
        const data = await response.json();
        setFunds(data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching funds:', error);
        setLoading(false);
      }
    }

    fetchFunds();
  }, []);

  return (
    <Container size="4">
      <Heading size="6" mb="4">All Funds</Heading>
      
      {loading ? (
        <Text>Loading funds...</Text>
      ) : (
        <Grid columns={{ initial: '1', md: '2' }} gap="4">
          {funds.map(fund => (
            <Card key={fund.id}>
              <Link to={`/funds/${fund.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <Flex direction="column" p="4">
                  <Heading size="4" mb="2">{fund.name}</Heading>
                  <Text color="gray" size="2" mb="3">{fund.description.substring(0, 150)}...</Text>
                  <Flex justify="between" align="center" mb="2">
                    <Text size="2" color="gray">Programs: {fund.programCount}</Text>
                    <Text size="2" color="blue">${fund.totalAmount.toLocaleString()}</Text>
                  </Flex>
                </Flex>
              </Link>
            </Card>
          ))}
        </Grid>
      )}
    </Container>
  );
}

// Single Fund component
function FundDetail() {
  const { id } = useParams();
  const [fund, setFund] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchFund() {
      try {
        const response = await fetch(`/api/funds/${id}`);
        if (!response.ok) {
          throw new Error('Fund not found');
        }
        const data = await response.json();
        setFund(data);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    }

    fetchFund();
  }, [id]);

  if (loading) return (
    <Container size="3">
      <Box py="8" textAlign="center">
        <Text>Loading fund details...</Text>
      </Box>
    </Container>
  );

  if (error) return (
    <Container size="3">
      <Box py="8" textAlign="center">
        <Heading size="5" mb="4" color="red">Error</Heading>
        <Text>{error}</Text>
        <Box mt="6">
          <Link to="/funds">
            <Button variant="soft">Back to Funds</Button>
          </Link>
        </Box>
      </Box>
    </Container>
  );

  return (
    <Container size="3">
      <Card>
        <Flex direction="column" p="6" gap="4">
          <Heading size="6">{fund.name}</Heading>
          
          <Flex align="center" gap="2" wrap="wrap">
            <Text size="2" color="gray">
              Total Amount: ${fund.totalAmount.toLocaleString()}
            </Text>
          </Flex>
          
          <Separator size="4" my="2" />
          
          <Text size="3">{fund.description}</Text>
          
          <Box mt="4">
            <Heading size="4" mb="3">Programs</Heading>
            {fund.programs.length > 0 ? (
              <Grid columns="1" gap="3">
                {fund.programs.map(program => (
                  <Card key={program.id}>
                    <Box p="3">
                      <Heading size="3" mb="2">{program.name}</Heading>
                      <Text size="2" mb="2">{program.description.substring(0, 150)}...</Text>
                      <Flex gap="3">
                        <Badge variant="soft">Milestones: {program.milestoneCount}</Badge>
                        <Badge variant="soft">Surveys: {program.surveyCount}</Badge>
                      </Flex>
                    </Box>
                  </Card>
                ))}
              </Grid>
            ) : (
              <Text color="gray">No programs found for this fund.</Text>
            )}
          </Box>
          
          <Box mt="4">
            <Heading size="4" mb="3">Sessions</Heading>
            {fund.sessions.length > 0 ? (
              <Grid columns="1" gap="3">
                {fund.sessions.map(session => (
                  <Card key={session.id}>
                    <Box p="3">
                      <Heading size="3" mb="1">Session #{session.id}</Heading>
                      <Flex gap="2" mb="2">
                        <Badge variant="soft">{session.status}</Badge>
                        <Text size="1" color="gray">User: {session.userName}</Text>
                        <Text size="1" color="gray">Program: {session.programName}</Text>
                      </Flex>
                      <Text size="2" color="gray">Created: {new Date(session.createdAt).toLocaleDateString()}</Text>
                    </Box>
                  </Card>
                ))}
              </Grid>
            ) : (
              <Text color="gray">No sessions found for this fund.</Text>
            )}
          </Box>
          
          <Flex justify="end" mt="4">
            <Link to="/funds">
              <Button variant="soft">Back to Funds</Button>
            </Link>
          </Flex>
        </Flex>
      </Card>
    </Container>
  );
}

// Sessions component to display all sessions
function Sessions() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSessions() {
      try {
        const response = await fetch('/api/sessions');
        const data = await response.json();
        setSessions(data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching sessions:', error);
        setLoading(false);
      }
    }

    fetchSessions();
  }, []);

  return (
    <Container size="4">
      <Heading size="6" mb="4">All Sessions</Heading>
      
      {loading ? (
        <Text>Loading sessions...</Text>
      ) : (
        <Grid columns={{ initial: '1', md: '2' }} gap="4">
          {sessions.map(session => (
            <Card key={session.id}>
              <Link to={`/sessions/${session.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <Flex direction="column" p="4">
                  <Heading size="4" mb="2">Session #{session.id}</Heading>
                  <Text color="gray" size="2" mb="3">{session.description}</Text>
                  <Flex justify="between" align="center">
                    <Text size="1" color="gray">Date: {new Date(session.date).toLocaleDateString()}</Text>
                    <Badge size="1">{session.fund.name}</Badge>
                  </Flex>
                </Flex>
              </Link>
            </Card>
          ))}
        </Grid>
      )}
    </Container>
  );
}

// Single Session component
function SessionDetail() {
  const { id } = useParams();
  const [session, setSession] = useState(null);
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchSession() {
      try {
        const response = await fetch(`/api/sessions/${id}`);
        if (!response.ok) {
          throw new Error('Session not found');
        }
        const data = await response.json();
        setSession(data);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    }

    fetchSession();
  }, [id]);

  const generateInsights = async () => {
    setInsightsLoading(true);
    try {
      const response = await fetch('/api/ai/generate-insights', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId: id }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate insights');
      }
      
      const data = await response.json();
      setInsights(data.insights);
      setInsightsLoading(false);
    } catch (err) {
      setError(err.message);
      setInsightsLoading(false);
    }
  };

  if (loading) return (
    <Container size="3">
      <Box py="8" textAlign="center">
        <Text>Loading session details...</Text>
      </Box>
    </Container>
  );

  if (error) return (
    <Container size="3">
      <Box py="8" textAlign="center">
        <Heading size="5" mb="4" color="red">Error</Heading>
        <Text>{error}</Text>
        <Box mt="6">
          <Link to="/sessions">
            <Button variant="soft">Back to Sessions</Button>
          </Link>
        </Box>
      </Box>
    </Container>
  );

  return (
    <Container size="3">
      <Card>
        <Flex direction="column" p="6" gap="4">
          <Heading size="6">Session #{session.id}</Heading>
          
          <Flex align="center" gap="2">
            <Text size="2" color="gray">
              Fund: {session.fund.name} | Date: {new Date(session.date).toLocaleDateString()}
            </Text>
          </Flex>
          
          <Separator size="4" my="2" />
          
          <Text size="3">{session.description}</Text>
          
          <Box>
            <Heading size="4" mb="3">Impact Data</Heading>
            <Card>
              <Box p="4">
                {session.data.metrics && (
                  <Box mb="4">
                    <Heading size="3" mb="2">Metrics</Heading>
                    <Grid columns={{ initial: '1', sm: '2' }} gap="3">
                      {Object.entries(session.data.metrics).map(([key, value]) => (
                        <Flex key={key} justify="between" p="2" style={{ backgroundColor: 'var(--gray-2)', borderRadius: 'var(--radius-2)' }}>
                          <Text size="2">{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</Text>
                          <Strong>{value.toLocaleString()}</Strong>
                        </Flex>
                      ))}
                    </Grid>
                  </Box>
                )}
                
                {session.data.keyFindings && (
                  <Box mb="4">
                    <Heading size="3" mb="2">Key Findings</Heading>
                    <Box pl="3" asChild>
                      <ul style={{ listStyleType: 'disc' }}>
                        {session.data.keyFindings.map((finding, index) => (
                          <li key={index}><Text size="2">{finding}</Text></li>
                        ))}
                      </ul>
                    </Box>
                  </Box>
                )}
                
                {session.data.challenges && (
                  <Box mb="4">
                    <Heading size="3" mb="2">Challenges</Heading>
                    <Box pl="3" asChild>
                      <ul style={{ listStyleType: 'disc' }}>
                        {session.data.challenges.map((challenge, index) => (
                          <li key={index}><Text size="2">{challenge}</Text></li>
                        ))}
                      </ul>
                    </Box>
                  </Box>
                )}
                
                {session.data.recommendations && (
                  <Box mb="4">
                    <Heading size="3" mb="2">Recommendations</Heading>
                    <Box pl="3" asChild>
                      <ul style={{ listStyleType: 'disc' }}>
                        {session.data.recommendations.map((recommendation, index) => (
                          <li key={index}><Text size="2">{recommendation}</Text></li>
                        ))}
                      </ul>
                    </Box>
                  </Box>
                )}
              </Box>
            </Card>
          </Box>
          
          <Box mt="4">
            <Heading size="4" mb="3">AI Insights</Heading>
            {insights ? (
              <Box p="4" style={{ 
                backgroundColor: 'var(--gray-2)', 
                borderRadius: 'var(--radius-3)',
                whiteSpace: 'pre-wrap'
              }}>
                <Text>{insights}</Text>
              </Box>
            ) : (
              <Flex direction="column" align="center" gap="3">
                <Text>Generate AI-powered insights based on this session's data</Text>
                <Button 
                  onClick={generateInsights} 
                  disabled={insightsLoading}
                  color="purple"
                >
                  {insightsLoading ? 'Generating...' : 'Generate Insights'}
                </Button>
              </Flex>
            )}
          </Box>
          
          <Box mt="4">
            <Link to="/sessions">
              <Button variant="soft">Back to Sessions</Button>
            </Link>
          </Box>
        </Flex>
      </Card>
    </Container>
  );
}

// Single Program component
function ProgramDetail() {
  const { id } = useParams();
  const [program, setProgram] = useState(null);
  const [funds, setFunds] = useState([]);
  const [selectedFundId, setSelectedFundId] = useState('');
  const [sessionCount, setSessionCount] = useState(1);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [logs, setLogs] = useState([]);
  const [generationComplete, setGenerationComplete] = useState(false);

  useEffect(() => {
    async function fetchProgramAndFunds() {
      try {
        // Fetch program details
        const programResponse = await fetch(`/api/programs/${id}`);
        if (!programResponse.ok) {
          throw new Error('Program not found');
        }
        const programData = await programResponse.json();
        setProgram(programData);
        
        // Fetch all funds
        const fundsResponse = await fetch('/api/funds');
        const fundsData = await fundsResponse.json();
        setFunds(fundsData);
        
        // Set default selected fund if program has associated funds
        if (programData.funds && programData.funds.length > 0) {
          setSelectedFundId(programData.funds[0].id.toString());
        } else if (fundsData.length > 0) {
          setSelectedFundId(fundsData[0].id.toString());
        }
        
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    }

    fetchProgramAndFunds();
  }, [id]);

  const generateSessions = async () => {
    if (!selectedFundId) {
      setError('Please select a fund');
      return;
    }

    setGenerating(true);
    setLogs([]);
    setGenerationComplete(false);
    setError(null);

    try {
      // Create EventSource for server-sent events to get real-time updates
      const eventSource = new EventSource(`/api/programs/${id}/generate-sessions?fundId=${selectedFundId}&count=${sessionCount}`);
      
      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.type === 'log') {
          setLogs(prevLogs => [...prevLogs, data.message]);
        } else if (data.type === 'complete') {
          setGenerationComplete(true);
          eventSource.close();
        } else if (data.type === 'error') {
          setError(data.message);
          eventSource.close();
        }
      };
      
      eventSource.onerror = () => {
        setError('Connection to server lost');
        eventSource.close();
        setGenerating(false);
      };
      
    } catch (err) {
      setError(err.message);
      setGenerating(false);
    }
  };

  if (loading) return (
    <Container size="3">
      <Box py="8" textAlign="center">
        <Text>Loading program details...</Text>
      </Box>
    </Container>
  );

  if (error && !program) return (
    <Container size="3">
      <Box py="8" textAlign="center">
        <Heading size="5" mb="4" color="red">Error</Heading>
        <Text>{error}</Text>
        <Box mt="6">
          <Link to="/programs">
            <Button variant="soft">Back to Programs</Button>
          </Link>
        </Box>
      </Box>
    </Container>
  );

  return (
    <Container size="3">
      <Card>
        <Flex direction="column" p="6" gap="4">
          <Heading size="6">{program.name}</Heading>
          
          <Text size="3">{program.description}</Text>
          
          <Separator size="4" my="2" />
          
          <Tabs.Root defaultValue="details">
            <Tabs.List>
              <Tabs.Trigger value="details">Program Details</Tabs.Trigger>
              <Tabs.Trigger value="generate">Generate Sessions</Tabs.Trigger>
            </Tabs.List>
            
            <Box pt="3">
              <Tabs.Content value="details">
                <Box>
                  <Heading size="4" mb="3">Milestones</Heading>
                  {program.milestones.length > 0 ? (
                    <Grid columns="1" gap="3">
                      {program.milestones.map(milestone => (
                        <Card key={milestone.id}>
                          <Box p="3">
                            <Heading size="3" mb="2">{milestone.title}</Heading>
                            <Text size="2">{milestone.description}</Text>
                          </Box>
                        </Card>
                      ))}
                    </Grid>
                  ) : (
                    <Text color="gray">No milestones found for this program.</Text>
                  )}
                  
                  <Heading size="4" mt="5" mb="3">Surveys</Heading>
                  {program.surveys.length > 0 ? (
                    <Grid columns="1" gap="3">
                      {program.surveys.map(survey => (
                        <Card key={survey.id}>
                          <Box p="3">
                            <Heading size="3" mb="2">{survey.title}</Heading>
                            <Text size="2">{survey.description}</Text>
                            <Badge variant="soft" mt="2">{survey.type}</Badge>
                          </Box>
                        </Card>
                      ))}
                    </Grid>
                  ) : (
                    <Text color="gray">No surveys found for this program.</Text>
                  )}
                  
                  <Heading size="4" mt="5" mb="3">Associated Funds</Heading>
                  {program.funds.length > 0 ? (
                    <Grid columns="1" gap="3">
                      {program.funds.map(fund => (
                        <Card key={fund.id}>
                          <Box p="3">
                            <Heading size="3" mb="2">{fund.name}</Heading>
                            <Text size="2">{fund.description.substring(0, 150)}...</Text>
                            <Text size="2" color="blue" mt="2">${fund.totalAmount.toLocaleString()}</Text>
                          </Box>
                        </Card>
                      ))}
                    </Grid>
                  ) : (
                    <Text color="gray">No funds associated with this program.</Text>
                  )}
                </Box>
              </Tabs.Content>
              
              <Tabs.Content value="generate">
                <Box>
                  <Heading size="4" mb="3">Generate Sessions</Heading>
                  
                  {error && (
                    <Box p="4" style={{ backgroundColor: 'var(--red-2)', borderLeft: '4px solid var(--red-9)', marginBottom: '16px' }}>
                      <Text color="red">{error}</Text>
                    </Box>
                  )}
                  
                  <Card>
                    <Box p="4">
                      <Flex direction="column" gap="4">
                        <Box>
                          <Text as="label" size="2" mb="1" display="block">Select Fund</Text>
                          <Select.Root 
                            value={selectedFundId} 
                            onValueChange={setSelectedFundId}
                            disabled={generating}
                          >
                            <Select.Trigger placeholder="Select a fund" />
                            <Select.Content>
                              {funds.map(fund => (
                                <Select.Item key={fund.id} value={fund.id.toString()}>
                                  {fund.name}
                                </Select.Item>
                              ))}
                            </Select.Content>
                          </Select.Root>
                        </Box>
                        
                        <Box>
                          <Text as="label" size="2" mb="1" display="block">Number of Sessions</Text>
                          <Flex gap="2" align="center">
                            <TextField.Root 
                              type="number" 
                              value={sessionCount} 
                              onChange={e => setSessionCount(Math.max(1, parseInt(e.target.value) || 1))}
                              disabled={generating}
                            />
                            <Flex gap="1">
                              <Button 
                                variant="soft" 
                                onClick={() => setSessionCount(prev => Math.max(1, prev - 1))}
                                disabled={sessionCount <= 1 || generating}
                              >
                                -
                              </Button>
                              <Button 
                                variant="soft" 
                                onClick={() => setSessionCount(prev => prev + 1)}
                                disabled={generating}
                              >
                                +
                              </Button>
                            </Flex>
                          </Flex>
                        </Box>
                        
                        <Button 
                          onClick={generateSessions} 
                          disabled={generating || !selectedFundId}
                          color="blue"
                        >
                          {generating ? 'Generating...' : 'Generate Sessions'}
                        </Button>
                      </Flex>
                    </Box>
                  </Card>
                  
                  {(generating || logs.length > 0) && (
                    <Box mt="4">
                      <Heading size="4" mb="3">Generation Progress</Heading>
                      <Card>
                        <Box p="4">
                          <ScrollArea style={{ height: '300px' }} scrollbars="vertical">
                            <Box style={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap', fontSize: '14px' }}>
                              {logs.map((log, index) => (
                                <Text key={index} mb="1">{log}</Text>
                              ))}
                              {generating && !generationComplete && (
                                <Text color="blue">Processing...</Text>
                              )}
                              {generationComplete && (
                                <Text color="green" weight="bold">Generation complete!</Text>
                              )}
                            </Box>
                          </ScrollArea>
                        </Box>
                      </Card>
                    </Box>
                  )}
                </Box>
              </Tabs.Content>
            </Box>
          </Tabs.Root>
          
          <Flex justify="end" mt="4">
            <Link to="/programs">
              <Button variant="soft">Back to Programs</Button>
            </Link>
          </Flex>
        </Flex>
      </Card>
    </Container>
  );
}

// Programs component to display all programs
function Programs() {
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPrograms() {
      try {
        const response = await fetch('/api/programs');
        const data = await response.json();
        setPrograms(data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching programs:', error);
        setLoading(false);
      }
    }

    fetchPrograms();
  }, []);

  return (
    <Container size="4">
      <Heading size="6" mb="4">All Programs</Heading>
      
      {loading ? (
        <Text>Loading programs...</Text>
      ) : (
        <Grid columns={{ initial: '1', md: '2' }} gap="4">
          {programs.map(program => (
            <Card key={program.id}>
              <Link to={`/programs/${program.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <Flex direction="column" p="4">
                  <Heading size="4" mb="2">{program.name}</Heading>
                  <Text color="gray" size="2" mb="3">{program.description.substring(0, 150)}...</Text>
                  <Flex justify="between" align="center">
                    <Text size="2" color="gray">Milestones: {program.milestoneCount}</Text>
                    <Text size="2" color="gray">Surveys: {program.surveyCount}</Text>
                  </Flex>
                </Flex>
              </Link>
            </Card>
          ))}
        </Grid>
      )}
    </Container>
  );
}

function App() {
  return (
    <Flex direction="column" style={{ minHeight: '100vh' }}>
      <Box style={{ backgroundColor: 'var(--gray-2)' }}>
        <Container size="4">
          <Flex py="4" justify="between" align="center">
            <Flex align="center" gap="4">
              <Link to="/" style={{ textDecoration: 'none' }}>
                <Heading size="5" style={{ color: 'var(--gray-12)' }}>Impact Fund Dashboard</Heading>
              </Link>
              <Flex as="nav" gap="5">
                <Link to="/" style={{ textDecoration: 'none', color: 'var(--gray-12)' }}>
                  <Text>Home</Text>
                </Link>
                <Link to="/funds" style={{ textDecoration: 'none', color: 'var(--gray-12)' }}>
                  <Text>Funds</Text>
                </Link>
                <Link to="/programs" style={{ textDecoration: 'none', color: 'var(--gray-12)' }}>
                  <Text>Programs</Text>
                </Link>
                <Link to="/sessions" style={{ textDecoration: 'none', color: 'var(--gray-12)' }}>
                  <Text>Sessions</Text>
                </Link>
              </Flex>
            </Flex>
          </Flex>
        </Container>
      </Box>

      <Box py="8" style={{ flex: 1 }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/funds" element={<Funds />} />
          <Route path="/funds/:id" element={<FundDetail />} />
          <Route path="/programs" element={<Programs />} />
          <Route path="/programs/:id" element={<ProgramDetail />} />
          <Route path="/sessions" element={<Sessions />} />
          <Route path="/sessions/:id" element={<SessionDetail />} />
        </Routes>
      </Box>

      <Box style={{ backgroundColor: 'var(--gray-2)' }}>
        <Container size="4">
          <Flex py="4" justify="between" align="center">
            <Text size="2" color="gray">© 2025 Impact Fund Dashboard</Text>
            <Flex gap="4">
              <RadixLink href="https://github.com/jordanmfray/fund-dashboards" target="_blank" size="2">GitHub</RadixLink>
              <RadixLink href="https://openai.com" target="_blank" size="2">OpenAI</RadixLink>
              <RadixLink href="https://radix-ui.com" target="_blank" size="2">Radix UI</RadixLink>
            </Flex>
          </Flex>
        </Container>
      </Box>
    </Flex>
  );
}

export default App;

