import React, { useState } from 'react';
import { Sparkles, CheckCircle, XCircle, RefreshCw, Trophy, BookOpen, ChevronRight, ChevronLeft, AlertCircle, Bot, Layers } from 'lucide-react';
import { api } from '../../services/api';

interface Question {
  id: number;
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
}

const BRANCH_TOPICS: { [branch: string]: string[] } = {
  'Computer Science & IT': [
    'Data Structures & Algorithms',
    'Full Stack Web Development (React/Node)',
    'Database Management Systems (SQL)',
    'Computer Networks & Protocols',
    'Operating Systems & Concurrency',
    'System Design & Microservices'
  ],
  'Electronics & Telecommunication': [
    'Embedded Systems & Microcontrollers',
    'IoT & Wireless Sensor Networks',
    'Digital Signal Processing (DSP)',
    'VLSI & Microelectronics',
    'Communication Engineering & RF',
    'Robotics & Automation Controls'
  ],
  'Mechanical Engineering': [
    'Thermodynamics & Heat Transfer',
    'CAD / CAM & Solid Modeling',
    'Manufacturing & Material Science',
    'Robotics & Mechatronics Systems',
    'Fluid Mechanics & Hydraulics',
    'Automotive Systems & EV Tech'
  ],
  'Civil Engineering': [
    'Structural Analysis & Design',
    'Geotechnical & Soil Mechanics',
    'Transportation & Highway Engineering',
    'Concrete Technology & RCC',
    'Environmental Engineering',
    'Surveying & GIS Systems'
  ]
};

// Built-in Local Question Bank organized by topic and difficulty
const buildLocalTopicQuestionBank = (
  branch: string,
  topic: string,
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced'
): Question[] => {
  const diffLabel = difficulty === 'Beginner' ? 'Foundational' : difficulty === 'Intermediate' ? 'Applied Engineering' : 'Advanced Optimization';

  const topicBanks: { [key: string]: Question[] } = {
    'Data Structures & Algorithms': [
      {
        id: 1,
        question: `[${diffLabel}] What is the worst-case time complexity of searching for a key in a balanced Binary Search Tree (such as an AVL or Red-Black Tree) with N nodes?`,
        options: ['O(log N)', 'O(N)', 'O(N log N)', 'O(1)'],
        correctAnswerIndex: 0,
        explanation: 'Self-balancing binary search trees maintain height h = O(log N), ensuring search, insertion, and deletion run in O(log N) worst-case time.'
      },
      {
        id: 2,
        question: `[${diffLabel}] Which data structure is most appropriate for implementing Breadth-First Search (BFS) traversal on an unweighted graph?`,
        options: ['FIFO Queue', 'LIFO Stack', 'Max-Heap Priority Queue', 'Disjoint Set Union'],
        correctAnswerIndex: 0,
        explanation: 'BFS explores vertices level by level in First-In-First-Out (FIFO) order, which is naturally maintained by a Queue.'
      },
      {
        id: 3,
        question: `[${diffLabel}] When resolving hash table collisions using Separate Chaining, what happens to the average lookup time if the load factor α = N / M remains bounded by a small constant?`,
        options: ['Remains O(1) average time', 'Degrades to O(N log N)', 'Requires full table rehashing on every read', 'Becomes O(M^2)'],
        correctAnswerIndex: 0,
        explanation: 'With a uniform hash function and bounded load factor α = O(1), the expected chain length is constant, yielding O(1) average lookup.'
      },
      {
        id: 4,
        question: `[${diffLabel}] Which algorithmic paradigm combines optimal substructure and overlapping subproblems using memoization or tabulation?`,
        options: ['Dynamic Programming', 'Greedy Choice Heuristics', 'Randomized Quicksort Partitioning', 'Branch-only Backtracking'],
        correctAnswerIndex: 0,
        explanation: 'Dynamic Programming avoids redundant recomputation of overlapping subproblems by caching intermediate results via memoization or bottom-up tabulation.'
      },
      {
        id: 5,
        question: `[${diffLabel}] For finding shortest paths from a single source in a weighted graph with non-negative edge weights, which algorithm using a Min-Heap achieves O((V + E) log V) complexity?`,
        options: ["Dijkstra's Algorithm", 'Bellman-Ford Algorithm', 'Floyd-Warshall Algorithm', "Kruskal's Spanning Tree Algorithm"],
        correctAnswerIndex: 0,
        explanation: "Dijkstra's algorithm greedily relaxes edges from the minimum-distance unsettled vertex using a priority queue in O((V + E) log V) time."
      }
    ],
    'Full Stack Web Development (React/Node)': [
      {
        id: 1,
        question: `[${diffLabel}] In React functional components, why must state updates be treated as immutable when updating arrays or objects?`,
        options: [
          'React relies on shallow reference comparison (Object.is) to detect state changes and trigger re-renders',
          'JavaScript arrays cannot be mutated in strict mode',
          'Mutable objects automatically clear browser localStorage',
          'React compilers reject const declarations'
        ],
        correctAnswerIndex: 0,
        explanation: 'React compares previous and next state references using Object.is. Mutating an existing object in place keeps the same reference and skips re-rendering.'
      },
      {
        id: 2,
        question: `[${diffLabel}] In an Express.js REST API, what is the role of error-handling middleware defined with four arguments (err, req, res, next)?`,
        options: [
          'Centralizing synchronous and asynchronous error interception to return consistent HTTP status codes and payloads',
          'Automatically encrypting database tables',
          'Replacing CORS headers with WebSocket frames',
          'Compiling TypeScript files in the browser'
        ],
        correctAnswerIndex: 0,
        explanation: 'Express identifies 4-parameter middleware functions specifically as error handlers invoked whenever next(err) is called.'
      },
      {
        id: 3,
        question: `[${diffLabel}] Which HTTP status code should a RESTful endpoint return when a client request is syntactically valid and authenticated, but the user lacks permission for the target resource?`,
        options: ['403 Forbidden', '401 Unauthorized', '404 Not Found', '502 Bad Gateway'],
        correctAnswerIndex: 0,
        explanation: '401 indicates missing or invalid authentication credentials, whereas 403 Forbidden indicates the authenticated user is not authorized for that action.'
      },
      {
        id: 4,
        question: `[${diffLabel}] What is the primary purpose of the dependency array in React's useEffect(fn, deps) hook?`,
        options: [
          'Controlling when the side-effect re-runs by comparing dependency values across renders',
          'Declaring CSS stylesheets for the component',
          'Defining database foreign keys',
          'Bypassing virtual DOM reconciliation'
        ],
        correctAnswerIndex: 0,
        explanation: 'React only re-executes the effect callback if at least one dependency in the array has changed since the previous render.'
      },
      {
        id: 5,
        question: `[${diffLabel}] How does Node.js handle thousands of concurrent I/O-bound HTTP requests on a single main JavaScript thread?`,
        options: [
          'Via an event-driven, non-blocking I/O loop backed by libuv asynchronous kernel/thread-pool operations',
          'By spawning a new OS process per HTTP header',
          'By blocking the main thread until SQL queries finish',
          'By disabling TCP keep-alive connections'
        ],
        correctAnswerIndex: 0,
        explanation: 'Node.js delegates I/O operations to the OS kernel or libuv worker pool and processes completion callbacks on the event loop without blocking.'
      }
    ],
    'Database Management Systems (SQL)': [
      {
        id: 1,
        question: `[${diffLabel}] Why are parameterized prepared statements mandatory when executing SQL queries with user-supplied input?`,
        options: [
          'They separate SQL query structure from data parameters, preventing SQL Injection attacks',
          'They automatically convert relational tables into NoSQL documents',
          'They bypass ACID transaction isolation',
          'They eliminate the need for primary keys'
        ],
        correctAnswerIndex: 0,
        explanation: 'Prepared statements bind user input strictly as literal values rather than executable SQL syntax, neutralizing SQL injection.'
      },
      {
        id: 2,
        question: `[${diffLabel}] In relational database indexing, why is a B+ Tree preferred over a hash index for range queries (e.g., WHERE created_at BETWEEN x AND y)?`,
        options: [
          'B+ Tree leaf nodes are stored in sorted order and linked sequentially for fast range scans',
          'Hash indexes sort keys alphabetically on disk',
          'B+ Trees require zero disk space',
          'Hash indexes only work on boolean columns'
        ],
        correctAnswerIndex: 0,
        explanation: 'B+ Trees maintain sorted keys in linked leaf pages, allowing efficient O(log N + K) range scans, whereas hash indexes only support equality lookups.'
      },
      {
        id: 3,
        question: `[${diffLabel}] Which ACID property guarantees that once a database transaction commits, its changes persist even in the event of an immediate power failure?`,
        options: ['Durability', 'Atomicity', 'Isolation', 'Consistency'],
        correctAnswerIndex: 0,
        explanation: 'Durability ensures committed transactions are recorded in non-volatile storage (such as Write-Ahead Logs) and survive crashes.'
      },
      {
        id: 4,
        question: `[${diffLabel}] What is the difference between WHERE and HAVING clauses in an SQL SELECT query?`,
        options: [
          'WHERE filters individual rows before GROUP BY aggregation, while HAVING filters aggregated groups',
          'HAVING executes before FROM, while WHERE executes after ORDER BY',
          'WHERE can only be used with strings, while HAVING only works with integers',
          'There is no difference; they are interchangeable aliases'
        ],
        correctAnswerIndex: 0,
        explanation: 'WHERE filters base table rows prior to grouping, whereas HAVING applies predicates to aggregate functions (like COUNT or AVG) after GROUP BY.'
      },
      {
        id: 5,
        question: `[${diffLabel}] A table is in Third Normal Form (3NF) if it is in 2NF and satisfies which additional condition?`,
        options: [
          'No non-prime attribute is transitively dependent on the primary key',
          'It contains no foreign keys',
          'All columns use VARCHAR data types',
          'Every table has at least तीन (3) composite indexes'
        ],
        correctAnswerIndex: 0,
        explanation: '3NF eliminates transitive functional dependencies (where non-key attribute A determines non-key attribute B), reducing update and deletion anomalies.'
      }
    ]
  };

  if (topicBanks[topic]) {
    return topicBanks[topic];
  }

  // Branch-aware domain questions when another specific topic is selected
  if (branch === 'Electronics & Telecommunication') {
    return [
      {
        id: 1,
        question: `[${diffLabel} • ${topic}] Why is the 'volatile' qualifier required in Embedded C when accessing memory-mapped peripheral status registers?`,
        options: [
          'It prevents the compiler from caching the register value in a CPU register across reads',
          'It places the variable in external Flash ROM',
          'It doubles the microcontroller clock frequency',
          'It automatically enables hardware parity checking'
        ],
        correctAnswerIndex: 0,
        explanation: 'Hardware peripherals or ISRs can update memory-mapped registers asynchronously; volatile forces every read/write to access the physical memory address.'
      },
      {
        id: 2,
        question: `[${diffLabel} • ${topic}] According to the Nyquist-Shannon Sampling Theorem, what is the minimum sampling frequency fs required to reconstruct a band-limited signal with maximum frequency fmax without aliasing?`,
        options: ['fs >= 2 * fmax', 'fs = 0.5 * fmax', 'fs = fmax / 4', 'fs <= fmax'],
        correctAnswerIndex: 0,
        explanation: 'Sampling at least twice the highest frequency component (the Nyquist rate, 2*fmax) prevents spectral folding (aliasing) in the frequency domain.'
      },
      {
        id: 3,
        question: `[${diffLabel} • ${topic}] Among serial communication protocols, why can I2C connect multiple slave devices using only two wires (SDA & SCL) compared to 4-wire SPI?`,
        options: [
          'I2C uses in-band 7-bit or 10-bit device addressing and open-drain bidirectional lines with pull-up resistors',
          'I2C transmits power and ground over the same single wire',
          'SPI does not support clock synchronization',
          'I2C operates only in analog frequency modulation mode'
        ],
        correctAnswerIndex: 0,
        explanation: 'I2C embeds target slave addresses in the frame header on shared open-drain SDA/SCL lines, avoiding dedicated chip-select (CS) wires per peripheral.'
      },
      {
        id: 4,
        question: `[${diffLabel} • ${topic}] In synchronous digital CMOS circuits, what occurs if an input signal changes inside the flip-flop Setup and Hold time window around the clock edge?`,
        options: [
          'Metastability, where the flip-flop output lingers in an indeterminate voltage state',
          'Automatic clock gating and zero dynamic power dissipation',
          'Deterministic frequency division by 8',
          'Immediate permanent oxide breakdown'
        ],
        correctAnswerIndex: 0,
        explanation: 'Violating setup or hold timing can leave the master-slave latch in a metastable state, causing unpredictable propagation delays and logic errors.'
      },
      {
        id: 5,
        question: `[${diffLabel} • ${topic}] In a PID feedback controller used in robotics and automation, what is the primary effect of adding the Integral (I) term?`,
        options: [
          'Eliminating steady-state error by accumulating error over time',
          'Increasing high-frequency sensor noise amplification',
          'Removing the need for a feedback sensor',
          'Converting closed-loop control into open-loop control'
        ],
        correctAnswerIndex: 0,
        explanation: 'The integral term integrates residual error over time, driving steady-state offset to zero even against constant disturbances.'
      }
    ];
  }

  if (branch === 'Mechanical Engineering') {
    return [
      {
        id: 1,
        question: `[${diffLabel} • ${topic}] Which failure theory is most widely used in Finite Element Analysis (FEA) to predict yielding of ductile engineering metals under multiaxial stress?`,
        options: [
          'Von Mises (Maximum Distortion Energy) Criterion',
          'Rankine Maximum Normal Stress Theory (Brittle only)',
          'Mohr-Coulomb Soil Cohesion Theory',
          'Bernoulli Inviscid Flow Principle'
        ],
        correctAnswerIndex: 0,
        explanation: 'Ductile metals yield primarily due to shear distortion energy; yielding begins when the Von Mises equivalent stress reaches the material yield strength Sy.'
      },
      {
        id: 2,
        question: `[${diffLabel} • ${topic}] In Geometric Dimensioning & Tolerancing (GD&T - ASME Y14.5), what does the Maximum Material Condition (MMC) modifier Ⓜ allow during part inspection?`,
        options: [
          'Additional geometric bonus tolerance as the feature size departs from its Maximum Material Condition toward LMC',
          'Elimination of all surface roughness requirements',
          'Replacing CNC machining with sand casting without tolerance checks',
          'Zero clearance interference fits on all mates'
        ],
        correctAnswerIndex: 0,
        explanation: 'MMC guarantees assemblability at worst-case size (largest pin / smallest hole) and grants bonus geometric positional tolerance as hole size increases or pin size decreases.'
      },
      {
        id: 3,
        question: `[${diffLabel} • ${topic}] In internal flow through a circular pipe, what dimensionless number governs the transition from laminar to turbulent flow?`,
        options: [
          'Reynolds Number (Re = ρVD / μ)',
          'Nusselt Number (Nu)',
          'Mach Number (Ma)',
          'Biot Number (Bi)'
        ],
        correctAnswerIndex: 0,
        explanation: 'Reynolds number represents the ratio of inertial forces to viscous forces; internal pipe flow typically transitions from laminar to turbulent between Re ≈ 2300 and 4000.'
      },
      {
        id: 4,
        question: `[${diffLabel} • ${topic}] In heat exchanger analysis, why does a Counter-Flow configuration achieve a higher Log Mean Temperature Difference (LMTD) than Parallel-Flow for identical inlet/outlet temperatures?`,
        options: [
          'It maintains a more uniform thermal driving temperature gradient along the entire heat transfer length',
          'It prevents conduction through the tube walls',
          'It operates without convective heat transfer',
          'It violates the Second Law of Thermodynamics'
        ],
        correctAnswerIndex: 0,
        explanation: 'Counter-flow heat exchangers maintain a sustained temperature difference along the exchanger length and allow the cold fluid outlet temperature to exceed the hot fluid outlet temperature.'
      },
      {
        id: 5,
        question: `[${diffLabel} • ${topic}] What is the primary metallurgical purpose of Tempering a high-carbon steel component immediately after Martensitic Quenching?`,
        options: [
          'Relieving internal residual stresses and increasing toughness/ductility while reducing extreme brittleness',
          'Melting the steel into liquid cast iron',
          'Removing all carbon atoms from the crystal lattice',
          'Decreasing corrosion resistance to zero'
        ],
        correctAnswerIndex: 0,
        explanation: 'As-quenched martensite is extremely hard but brittle; tempering reheats the steel below the lower critical temperature (A1) to precipitate fine carbides and restore toughness.'
      }
    ];
  }

  if (branch === 'Civil Engineering') {
    return [
      {
        id: 1,
        question: `[${diffLabel} • ${topic}] According to IS 456:2000 for Reinforced Cement Concrete (RCC) flexural design, why are under-reinforced sections mandatory instead of over-reinforced sections?`,
        options: [
          'Tension steel yields first, providing visible ductile deflection and cracking warning prior to concrete crushing',
          'Over-reinforced sections require zero steel reinforcement',
          'Concrete has higher tensile strength than structural steel',
          'Under-reinforced beams never experience shear forces'
        ],
        correctAnswerIndex: 0,
        explanation: 'In an under-reinforced beam, steel reaches its yield strain before concrete reaches its ultimate compressive strain (0.0035), ensuring ductile failure with warning.'
      },
      {
        id: 2,
        question: `[${diffLabel} • ${topic}] In geotechnical engineering, what does Terzaghi's Effective Stress Principle (σ' = σ - u) state about saturated soil strength?`,
        options: [
          'Shear strength and volume change depend on effective intergranular stress (total stress minus pore water pressure)',
          'Pore water carries 100% of shear stress in cohesionless sand',
          'Water table depth has no impact on foundation bearing capacity',
          'Total stress is always zero below the phreatic line'
        ],
        correctAnswerIndex: 0,
        explanation: 'Increased pore water pressure u reduces effective normal stress σ’ between soil grains, directly reducing frictional shear resistance.'
      },
      {
        id: 3,
        question: `[${diffLabel} • ${topic}] For a simply supported beam of span L subjected to a uniformly distributed load w (kN/m) over its entire length, what is the maximum bending moment at mid-span?`,
        options: ['wL² / 8', 'wL / 4', 'wL² / 12', 'wL³ / 48EI'],
        correctAnswerIndex: 0,
        explanation: 'With support reactions R = wL/2 at both ends, the mid-span bending moment is (wL/2)*(L/2) - w*(L/2)*(L/4) = wL² / 8.'
      },
      {
        id: 4,
        question: `[${diffLabel} • ${topic}] In concrete technology, what is the primary effect of increasing the Water-Cement (w/c) ratio beyond the design optimum without admixtures?`,
        options: [
          'Increases capillary porosity and bleeding, significantly reducing 28-day compressive strength and durability',
          'Doubles the 28-day characteristic compressive strength',
          'Eliminates drying shrinkage cracks completely',
          'Accelerates initial setting time to 30 seconds'
        ],
        correctAnswerIndex: 0,
        explanation: "By Abrams' Law, excess mixing water not consumed in cement hydration leaves capillary voids, lowering compressive strength and increasing permeability."
      },
      {
        id: 5,
        question: `[${diffLabel} • ${topic}] In Total Station and GIS surveying, what is the purpose of closing a traverse loop back onto a known benchmark/control point?`,
        options: [
          'Calculating linear and angular misclosure to verify survey precision and apply Bowditch/Transit adjustments',
          'Resetting satellite orbital ephemeris data',
          'Eliminating the curvature of the Earth',
          'Measuring soil plasticity index'
        ],
        correctAnswerIndex: 0,
        explanation: 'Closing a traverse on a known control station reveals accumulated angular and linear errors so they can be checked against permissible tolerances and distributed.'
      }
    ];
  }

  // Default CS/IT topic bank (Computer Networks, OS, System Design)
  return [
    {
      id: 1,
      question: `[${diffLabel} • ${topic}] Which mechanism prevents race conditions when multiple threads concurrently modify a shared critical section?`,
      options: [
        'Mutual Exclusion locks (Mutexes), Semaphores, or Atomic Compare-And-Swap operations',
        'Increasing CPU L1 cache size',
        'Disabling TCP congestion control',
        'Using unindexed global variables'
      ],
      correctAnswerIndex: 0,
      explanation: 'Synchronization primitives (mutexes, semaphores, atomic instructions) ensure only one thread executes the critical section or mutates shared state atomically.'
    },
    {
      id: 2,
      question: `[${diffLabel} • ${topic}] In distributed system design, what is the primary purpose of placing a Reverse Proxy / Load Balancer and Redis Cache in front of application servers?`,
      options: [
        'Distributing traffic across healthy instances and serving hot read queries from memory with sub-millisecond latency',
        'Forcing all client requests to execute sequentially on a single thread',
        'Storing unencrypted user passwords in browser cookies',
        'Replacing TLS encryption with plain HTTP'
      ],
      correctAnswerIndex: 0,
      explanation: 'Load balancers eliminate single points of failure and horizontal bottlenecks, while in-memory caching offloads repetitive read queries from the primary database.'
    },
    {
      id: 3,
      question: `[${diffLabel} • ${topic}] Why does TCP use a 3-Way Handshake (SYN, SYN-ACK, ACK) before transmitting application data?`,
      options: [
        'To synchronize initial sequence numbers (ISNs) and confirm bidirectional reachability between client and server',
        'To broadcast MAC addresses across all VLANs',
        'To compress HTML files into JPEG images',
        'To bypass firewall port rules'
      ],
      correctAnswerIndex: 0,
      explanation: 'The 3-way handshake establishes reliable full-duplex connection state and agrees on starting sequence numbers for ordered, loss-detected byte delivery.'
    },
    {
      id: 4,
      question: `[${diffLabel} • ${topic}] Which four conditions (Coffman conditions) must all hold simultaneously for a resource deadlock to occur in an operating system?`,
      options: [
        'Mutual Exclusion, Hold and Wait, No Preemption, and Circular Wait',
        'Paging, Segmentation, Swapping, and Thrashing',
        'Fork, Exec, Wait, and Exit',
        'Encryption, Hashing, Salting, and Signing'
      ],
      correctAnswerIndex: 0,
      explanation: 'Deadlock occurs if and only if Mutual Exclusion, Hold and Wait, No Preemption, and Circular Wait hold simultaneously; breaking any one prevents deadlock.'
    },
    {
      id: 5,
      question: `[${diffLabel} • ${topic}] In microservices architecture, what is the role of the Circuit Breaker pattern when calling a downstream service?`,
      options: [
        'Failing fast and preventing cascading resource exhaustion when a downstream dependency experiences high failure rates',
        'Physically shutting down the server power supply',
        'Deleting database tables when latency exceeds 10ms',
        'Merging all microservices into a single CSS file'
      ],
      correctAnswerIndex: 0,
      explanation: 'A Circuit Breaker monitors downstream failures and trips "Open" to return immediate fallback responses, giving the failing service time to recover.'
    }
  ];
};

export const AITechnicalQuizSection: React.FC = () => {
  const [selectedBranch, setSelectedBranch] = useState<string>('Computer Science & IT');
  const [selectedTopic, setSelectedTopic] = useState<string>('Data Structures & Algorithms');
  const [difficulty, setDifficulty] = useState<'Beginner' | 'Intermediate' | 'Advanced'>('Intermediate');

  const [loading, setLoading] = useState<boolean>(false);
  const [questions, setQuestions] = useState<Question[]>(() =>
    buildLocalTopicQuestionBank('Computer Science & IT', 'Data Structures & Algorithms', 'Intermediate')
  );
  const [quizSource, setQuizSource] = useState<'AI' | 'LOCAL'>('LOCAL');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [viewAllMode, setViewAllMode] = useState<boolean>(false);
  const [userAnswers, setUserAnswers] = useState<{ [questionId: number]: number }>({});
  const [quizSubmitted, setQuizSubmitted] = useState<boolean>(false);
  const [infoNotice, setInfoNotice] = useState<string | null>(null);

  const handleBranchChange = (branch: string) => {
    setSelectedBranch(branch);
    const firstTopic = BRANCH_TOPICS[branch]?.[0] || 'Data Structures & Algorithms';
    setSelectedTopic(firstTopic);
    const localBank = buildLocalTopicQuestionBank(branch, firstTopic, difficulty);
    setQuestions(localBank);
    setQuizSource('LOCAL');
    setCurrentQuestionIndex(0);
    setUserAnswers({});
    setQuizSubmitted(false);
    setInfoNotice(null);
  };

  const handleTopicChange = (topic: string) => {
    setSelectedTopic(topic);
    const localBank = buildLocalTopicQuestionBank(selectedBranch, topic, difficulty);
    setQuestions(localBank);
    setQuizSource('LOCAL');
    setCurrentQuestionIndex(0);
    setUserAnswers({});
    setQuizSubmitted(false);
    setInfoNotice(null);
  };

  const handleDifficultyChange = (nextDiff: 'Beginner' | 'Intermediate' | 'Advanced') => {
    setDifficulty(nextDiff);
    const localBank = buildLocalTopicQuestionBank(selectedBranch, selectedTopic, nextDiff);
    setQuestions(localBank);
    setQuizSource('LOCAL');
    setCurrentQuestionIndex(0);
    setUserAnswers({});
    setQuizSubmitted(false);
    setInfoNotice(null);
  };

  const generateQuiz = async () => {
    setLoading(true);
    setInfoNotice(null);
    setQuizSubmitted(false);
    setUserAnswers({});
    setCurrentQuestionIndex(0);

    const prompt = `Generate a high-quality 5-question technical multiple-choice quiz for an engineering internship candidate.

BRANCH: ${selectedBranch}
TOPIC: ${selectedTopic}
DIFFICULTY LEVEL: ${difficulty}

Return ONLY a valid JSON array of 5 objects matching this exact format:
[
  {
    "id": 1,
    "question": "Clear technical question text...",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswerIndex": 0,
    "explanation": "Concise technical explanation why the correct option is right and why other options are incorrect."
  }
]

Do NOT include any markdown formatting wrappers or conversational text outside the JSON array.`;

    try {
      const res = await api.post<{ success: boolean; text: string; provider: string; model: string }>('/ai/generate/', {
        prompt,
        systemInstruction: 'You are a Senior Technical Examiner for MITCORER Placement Cell. Produce precise, randomized, high-yield technical multiple choice questions with answers in strict JSON array format.',
        featureName: 'TECHNICAL_QUIZ',
        responseFormat: 'json'
      });

      let rawText = (res.text || '').trim();
      const jsonBracketMatch = rawText.match(/\[[\s\S]*\]/);
      if (jsonBracketMatch) {
        rawText = jsonBracketMatch[0];
      }

      const parsedQuestions: Question[] = JSON.parse(rawText);

      if (!Array.isArray(parsedQuestions) || parsedQuestions.length === 0) {
        throw new Error('Received invalid quiz structure from AI model.');
      }

      const normalized: Question[] = parsedQuestions.slice(0, 5).map((q, idx) => ({
        id: idx + 1,
        question: String(q.question || `Question ${idx + 1}`),
        options: Array.isArray(q.options) && q.options.length >= 2 ? q.options.map(String) : ['Option A', 'Option B', 'Option C', 'Option D'],
        correctAnswerIndex: typeof q.correctAnswerIndex === 'number' && q.correctAnswerIndex >= 0 && q.correctAnswerIndex < 4 ? q.correctAnswerIndex : 0,
        explanation: String(q.explanation || 'Verified technical solution.')
      }));

      setQuestions(normalized);
      setQuizSource('AI');
    } catch (_err: any) {
      const localBank = buildLocalTopicQuestionBank(selectedBranch, selectedTopic, difficulty);
      setQuestions(localBank);
      setQuizSource('LOCAL');
      setInfoNotice(`Loaded 5 verified ${selectedTopic} (${difficulty}) questions from the Built-in Local Question Bank.`);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOption = (questionId: number, optionIndex: number) => {
    if (quizSubmitted) return;
    setUserAnswers(prev => ({
      ...prev,
      [questionId]: optionIndex
    }));
  };

  const calculateScore = () => {
    let score = 0;
    questions.forEach(q => {
      if (userAnswers[q.id] === q.correctAnswerIndex) {
        score += 1;
      }
    });
    return score;
  };

  const renderQuestionCard = (q: Question, qIndex: number) => {
    const selectedOpt = userAnswers[q.id];

    return (
      <div
        key={q.id}
        style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#2563eb' }}>
            QUESTION {qIndex + 1} OF {questions.length}
          </div>
          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>
            {selectedTopic} • {difficulty}
          </span>
        </div>

        <h3 style={{ fontSize: '15.5px', fontWeight: 700, color: '#0f172a', marginBottom: '16px', lineHeight: 1.5 }}>
          {q.question}
        </h3>

        {/* Option Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
          {q.options.map((opt, oIdx) => {
            const isSelected = selectedOpt === oIdx;
            const isCorrect = oIdx === q.correctAnswerIndex;

            let bg = '#f8fafc';
            let border = '#e2e8f0';
            let text = '#1e293b';

            if (quizSubmitted) {
              if (isCorrect) {
                bg = '#ecfdf5';
                border = '#10b981';
                text = '#065f46';
              } else if (isSelected && !isCorrect) {
                bg = '#fef2f2';
                border = '#ef4444';
                text = '#991b1b';
              }
            } else if (isSelected) {
              bg = '#eff6ff';
              border = '#2563eb';
              text = '#1e40af';
            }

            return (
              <button
                key={oIdx}
                type="button"
                onClick={() => handleSelectOption(q.id, oIdx)}
                disabled={quizSubmitted}
                style={{
                  textAlign: 'left',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  backgroundColor: bg,
                  border: `1.5px solid ${border}`,
                  color: text,
                  fontSize: '13.5px',
                  fontWeight: isSelected || (quizSubmitted && isCorrect) ? 700 : 500,
                  cursor: quizSubmitted ? 'default' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                  <span style={{
                    width: '24px', height: '24px', borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '12px', fontWeight: 800,
                    backgroundColor: isSelected ? '#2563eb' : '#e2e8f0',
                    color: isSelected ? '#ffffff' : '#475569',
                    flexShrink: 0
                  }}>
                    {String.fromCharCode(65 + oIdx)}
                  </span>
                  <span>{opt}</span>
                </div>

                {quizSubmitted && isCorrect && <CheckCircle size={18} color="#059669" />}
                {quizSubmitted && isSelected && !isCorrect && <XCircle size={18} color="#dc2626" />}
              </button>
            );
          })}
        </div>

        {/* Instant Explanation Box (when submitted) */}
        {quizSubmitted && (
          <div style={{
            backgroundColor: selectedOpt === q.correctAnswerIndex ? '#f0fdf4' : '#fff1f2',
            border: `1px solid ${selectedOpt === q.correctAnswerIndex ? '#bbf7d0' : '#fecdd3'}`,
            borderRadius: '8px',
            padding: '12px 16px',
            fontSize: '13px',
            lineHeight: 1.5,
            color: selectedOpt === q.correctAnswerIndex ? '#166534' : '#9f1239'
          }}>
            <strong>Explanation:</strong> {q.explanation}
          </div>
        )}
      </div>
    );
  };

  const activeQuestion = questions[currentQuestionIndex] || questions[0];

  return (
    <div className="card" style={{ padding: '24px', backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <BookOpen size={16} /> Technical Assessment & Quiz Generator
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
            Technical Interview Prep Quizzes
          </h2>
          <p style={{ color: '#64748b', fontSize: '13px', marginTop: '4px' }}>
            Select your engineering branch, topic, and difficulty to practice technical MCQs with instant answer explanations.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <span
            style={{
              fontSize: '11.5px',
              fontWeight: 700,
              padding: '5px 12px',
              borderRadius: '999px',
              backgroundColor: quizSource === 'AI' ? '#eff6ff' : '#fef3c7',
              color: quizSource === 'AI' ? '#1e40af' : '#92400e',
              border: `1px solid ${quizSource === 'AI' ? '#bfdbfe' : '#fde68a'}`,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Bot size={14} />
            {quizSource === 'AI' ? 'Generated by Live AI' : 'Built-in Local Question Bank'}
          </span>

          {quizSubmitted && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '12px' }}>
              <Trophy size={18} color="#059669" />
              <div>
                <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#065f46' }}>
                  Score: {calculateScore()} / {questions.length} ({Math.round((calculateScore() / questions.length) * 100)}%)
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quiz Configuration Panel */}
      <div style={{ backgroundColor: '#f8fafc', padding: '18px', borderRadius: '14px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '16px' }}>
          {/* Branch Selection */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
              ENGINEERING BRANCH
            </label>
            <select
              value={selectedBranch}
              onChange={(e) => handleBranchChange(e.target.value)}
              className="form-control"
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13.5px', fontWeight: 600, color: '#0f172a' }}
            >
              {Object.keys(BRANCH_TOPICS).map(branch => (
                <option key={branch} value={branch}>{branch}</option>
              ))}
            </select>
          </div>

          {/* Topic Selection */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
              TECHNICAL TOPIC / DOMAIN
            </label>
            <select
              value={selectedTopic}
              onChange={(e) => handleTopicChange(e.target.value)}
              className="form-control"
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13.5px', fontWeight: 600, color: '#0f172a' }}
            >
              {(BRANCH_TOPICS[selectedBranch] || []).map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Difficulty Level */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
              DIFFICULTY LEVEL
            </label>
            <select
              value={difficulty}
              onChange={(e) => handleDifficultyChange(e.target.value as 'Beginner' | 'Intermediate' | 'Advanced')}
              className="form-control"
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13.5px', fontWeight: 600, color: '#0f172a' }}
            >
              <option value="Beginner">Beginner (Foundations)</option>
              <option value="Intermediate">Intermediate (Core Concepts)</option>
              <option value="Advanced">Advanced (Problem Solving)</option>
            </select>
          </div>
        </div>

        <button
          onClick={generateQuiz}
          disabled={loading}
          className="btn btn-primary"
          style={{ width: '100%', padding: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '14px' }}
        >
          {loading ? (
            <>
              <RefreshCw size={18} className="animate-spin" /> Generating Fresh {selectedTopic} Quiz...
            </>
          ) : (
            <>
              <Sparkles size={18} /> Generate New {selectedTopic} Quiz ({difficulty})
            </>
          )}
        </button>
      </div>

      {/* Info Notice */}
      {infoNotice && (
        <div style={{ padding: '10px 14px', backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', color: '#92400e', fontSize: '12.5px', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={16} /> {infoNotice}
        </div>
      )}

      {/* Question Navigation Bar */}
      {questions.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', padding: '12px 16px', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569', marginRight: '4px' }}>
                Jump to Question:
              </span>
              {questions.map((q, idx) => {
                const isCurrent = !viewAllMode && currentQuestionIndex === idx;
                const isAnswered = userAnswers[q.id] !== undefined;
                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => {
                      setViewAllMode(false);
                      setCurrentQuestionIndex(idx);
                    }}
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      border: `1.5px solid ${isCurrent ? '#2563eb' : isAnswered ? '#10b981' : '#cbd5e1'}`,
                      backgroundColor: isCurrent ? '#2563eb' : isAnswered ? '#ecfdf5' : '#ffffff',
                      color: isCurrent ? '#ffffff' : isAnswered ? '#047857' : '#334155',
                      fontWeight: 700,
                      fontSize: '12.5px',
                      cursor: 'pointer'
                    }}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setViewAllMode(prev => !prev)}
              className="btn btn-outline btn-sm"
              style={{ fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Layers size={14} />
              {viewAllMode ? 'Switch to Single Question View' : `Show All ${questions.length} Questions`}
            </button>
          </div>

          {/* Render either Single Active Question with Prev/Next Controls OR All Questions */}
          {viewAllMode ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {questions.map((q, qIdx) => renderQuestionCard(q, qIdx))}
            </div>
          ) : (
            activeQuestion && (
              <div>
                {renderQuestionCard(activeQuestion, currentQuestionIndex)}

                {/* Previous / Next Question Navigation Controls */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px', gap: '12px' }}>
                  <button
                    type="button"
                    onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                    disabled={currentQuestionIndex === 0}
                    className="btn btn-outline"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px' }}
                  >
                    <ChevronLeft size={16} /> Previous Question
                  </button>

                  <span style={{ fontSize: '12.5px', color: '#64748b', fontWeight: 600 }}>
                    Answered: {Object.keys(userAnswers).length} of {questions.length}
                  </span>

                  <button
                    type="button"
                    onClick={() => setCurrentQuestionIndex(prev => Math.min(questions.length - 1, prev + 1))}
                    disabled={currentQuestionIndex >= questions.length - 1}
                    className="btn btn-outline"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px' }}
                  >
                    Next Question <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )
          )}

          {/* Submit / Finish Quiz Button */}
          {!quizSubmitted ? (
            <button
              type="button"
              onClick={() => {
                setQuizSubmitted(true);
                setViewAllMode(true);
              }}
              disabled={Object.keys(userAnswers).length === 0}
              className="btn btn-primary"
              style={{ padding: '14px', fontSize: '15px', fontWeight: 700, marginTop: '4px' }}
            >
              Submit Quiz & View All Explanations ({Object.keys(userAnswers).length} / {questions.length} answered)
            </button>
          ) : (
            <div style={{ display: 'flex', gap: '12px', marginTop: '4px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => {
                  setQuizSubmitted(false);
                  setUserAnswers({});
                  setCurrentQuestionIndex(0);
                  setViewAllMode(false);
                }}
                className="btn btn-outline"
                style={{ flex: 1, padding: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', fontWeight: 700 }}
              >
                Retake Current Quiz
              </button>
              <button
                type="button"
                onClick={generateQuiz}
                className="btn btn-primary"
                style={{ flex: 1, padding: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', fontWeight: 700 }}
              >
                <RefreshCw size={16} /> Generate New {selectedTopic} Quiz
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
