const express = require('express');
const app = express();
const port = 4000;
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const connectDB = require('./db');
const User = require('./models/user');
const Order = require('./models/order');
const axios = require('axios');
const dotenv = require('dotenv');

app.use(bodyParser.json());
app.use(cors());

connectDB();

app.post('/signup', async (req, res) => {
    try {
        const { name, companyName, workEmail, password } = req.body;
        
        if (!name || !companyName || !workEmail || !password) {
            return res.status(400).json({ message: 'Tous les champs sont obligatoires' });
        }

        const existingUser = await User.findOne({ workEmail });
        if (existingUser) {
            return res.status(400).json({ message: 'Un utilisateur avec cet email existe déjà' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({
            name,
            companyName,
            workEmail,
            password: hashedPassword,
        });

        await newUser.save();

        const { password: _, ...userWithoutPassword } = newUser.toObject();
        res.status(201).json({ message: 'Utilisateur créé avec succès', user: userWithoutPassword });
        console.log('Utilisateur ajouté avec succès');
    } catch (error) {
        console.error('Erreur lors de l\'inscription:', error.message);
        res.status(500).json({ message: 'Erreur serveur', error: error.message });
    }
});

app.post('/signin', async (req, res) => {
    const { workEmail, password } = req.body;

    if (!workEmail || !password) {
        return res.status(400).json({ message: 'Email et mot de passe sont obligatoires' });
    }

    try {
        const user = await User.findOne({ workEmail });
        if (!user) {
            return res.status(404).json({ message: 'Utilisateur introuvable' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Mot de passe incorrect' });
        }
        
        

        // const token = jwt.sign({ id: user._id, workEmail: user.workEmail }, JWT_SECRET, {
        //     expiresIn: '1h',
        // });

        res.status(200).json({ message: 'Connexion réussie'});
    } catch (err) {
        res.status(500).json({ message: 'Erreur serveur', error: err.message });
    }
});

app.post('/save-order', async (req, res) => {
    console.log("Request body:", req.body); 
    const { versioningTool, hostingType, monitoringTool, hostingJarTool,status } = req.body;
    const order = new Order({
        versioningTool,
        hostingType,
        monitoringTool,
        hostingJarTool,
        status: status || "en attente",
    });
    await order.save();
    res.status(201).send({ message: "Order saved successfully!" });
  });

app.get("/orders", async (req, res) => {

    try {
      const orders = await Order.find();
      res.json(orders);
    } catch (error) {
      res.status(500).json({ message: "Error fetching orders", error });
    }
  });  


// app.post('/accept-order/:id', async (req, res) => { 
//     try {
//         console.log("token :", GITHUBTOKEN);   
//         req.body={};
//         const { id } = req.params;
//         const order = await Order.findByIdAndUpdate(
//             id,
//             { status: "acceptée" },
//             { new: true }
//         );

//         if (!order) {
//             return res.status(404).json({ message: "Order not found" });
//         }

//         const workflowDispatchUrl = `https://api.github.com/repos/comweave/Pipelines_Version2/actions/workflows/github-workflow.yml/dispatches`;
//         const workflowInputs = {
//             versioningTool: order.versioningTool,
//             hostingType: order.hostingType,
//             monitoringTool: order.monitoringTool,
//             hostingJarTool: order.hostingJarTool,
//         };

//         await axios.post(
//             workflowDispatchUrl,
//             {
//                 ref: "main",
//                 inputs: workflowInputs,
//             },
//             {
//                 headers: {
//                     Authorization: `token ${GITHUBTOKEN}`,
//                     Accept: "application/vnd.github.v3+json",
//                 },
//             }
//         );

//         const workflowRunsUrl = `https://api.github.com/repos/comweave/Pipelines_Version2/actions/runs`;
//         let repoUrl = null;

//         for (let i = 0; i < 10; i++) {
//             const { data } = await axios.get(workflowRunsUrl, {
//                 headers: {
//                     Authorization: `token ${GITHUBTOKEN}`,
//                     Accept: "application/vnd.github.v3+json",
//                 },
//             });
//             console.log(data)
//             const latestRun = data.workflow_runs.find(
//                 (run) => run.head_branch === "main" && run.status === "completed"
//             );

//             if (latestRun) {
//                 const runId = latestRun.id;
//                 const runDetailsUrl = `https://api.github.com/repos/comweave/Pipelines_Version2/actions/runs/${runId}/jobs`;

//                 const runDetails = await axios.get(runDetailsUrl, {
//                     headers: {
//                         Authorization: `token ${GITHUBTOKEN}`,
//                         Accept: "application/vnd.github.v3+json",
//                     },
//                 });

//                 repoUrl = runDetails.data.jobs[0].steps.find(
//                     (step) => step.name === "Create Repository"
//                 ).output.repo_url;

//                 break;
//             }

//             await new Promise((resolve) => setTimeout(resolve, 5000));
//         }

//         if (!repoUrl) {
//             return res.status(500).json({
//                 message: "Failed to fetch repository URL from workflow",
//             });
//         }

//         res.status(200).json({
//             message: "Order accepted and repository created",
//             repoUrl,
//         });
//     } catch (error) {
//         console.error("Error accepting order:", error.message);
//         res.status(500).json({ message: "Error accepting order", error: error.message });
//     }
// });

// app.post('/accept-order/:id', async (req, res) => {
//     const result= require("dotenv").config();
//     const GITHUBTOKEN = result.parsed.GITHUBTOKEN;
//     console.log("GitHub Token:", GITHUBTOKEN);
//     try {
//         if (!GITHUBTOKEN) {
//             return res.status(500).json({ message: "GitHub token is missing" });
//         }

//         console.log("Order ID:", req.params.id);
//         const { id } = req.params;
//         const order = await Order.findByIdAndUpdate(
//             id,
//             { status: "acceptée" },
//             { new: true }
//         );

//         if (!order) {
//             return res.status(404).json({ message: "Order not found" });
//         }

//         console.log("Order found:", order);

//         const workflowDispatchUrl = `https://api.github.com/repos/comweave/Pipelines_Version2/actions/workflows/github-workflow.yml/dispatches`;
//         const workflowInputs = {
//             versioningTool: order.versioningTool,
//             hostingType: order.hostingType,
//             monitoringTool: order.monitoringTool,
//             hostingJarTool: order.hostingJarTool,
//         };

//         console.log("Dispatching workflow with inputs:", workflowInputs);

//         await axios.post(
//             workflowDispatchUrl,
//             {
//                 ref: "main",
//                 inputs: workflowInputs,
//             },
//             {
//                 headers: {
//                     Authorization: `token ${GITHUBTOKEN}`,
//                     Accept: "application/vnd.github.v3+json",
//                 },
//             }
//         );

//         console.log("Workflow dispatched successfully");

//         const workflowRunsUrl = `https://api.github.com/repos/comweave/Pipelines_Version2/actions/runs`;
//         let repoUrl = null;

//         for (let i = 0; i < 10; i++) {
//             const { data } = await axios.get(workflowRunsUrl, {
//                 headers: {
//                     Authorization: `token ${GITHUBTOKEN}`,
//                     Accept: "application/vnd.github.v3+json",
//                 },
//             });

//             console.log(`Polling attempt ${i + 1}:`, data);

//             const latestRun = data.workflow_runs.find(
//                 (run) => run.head_branch === "main" && run.status === "completed"
//             );

//             if (latestRun) {
//                 const runId = latestRun.id;
//                 const runDetailsUrl = `https://api.github.com/repos/comweave/Pipelines_Version2/actions/runs/${runId}/jobs`;

//                 const runDetails = await axios.get(runDetailsUrl, {
//                     headers: {
//                         Authorization: `token ${GITHUBTOKEN}`,
//                         Accept: "application/vnd.github.v3+json",
//                     },
//                 });

//                 console.log("Run Details:", runDetails.data);

//                 const repoStep = runDetails.data.jobs[0].steps.find(
//                     (step) => step.name === "Create Repository"
//                 );

//                 if (repoStep && repoStep.output && repoStep.output.repo_url) {
//                     repoUrl = repoStep.output.repo_url;
//                 }

//                 break;
//             }

//             await new Promise((resolve) => setTimeout(resolve, 10000)); // 10 seconds
//         }

//         if (!repoUrl) {
//             return res.status(500).json({
//                 message: "Failed to fetch repository URL from workflow",
//             });
//         }

//         res.status(200).json({
//             message: "Order accepted and repository created",
//             repoUrl,
//         });
//     } catch (error) {
//         console.error("Error accepting order:", error);
//         res.status(500).json({ message: "Error accepting order", error: error.message });
//     }
// });
// app.post("/accept-order/:id", async (req, res) => {
//     const result = require("dotenv").config();
//     const GITHUBTOKEN = result.parsed.GITHUBTOKEN;
  
//     try {
//       const { id } = req.params;
  
//       // Update the order status
//       const order = await Order.findByIdAndUpdate(
//         id,
//         { status: "acceptée" },
//         { new: true }
//       );
  
//       if (!order) {
//         console.error(`Order not found for ID: ${id}`);
//         return res.status(404).json({ message: "Order not found" });
//       }
  
//       const workflowDispatchUrl =
//         "https://api.github.com/repos/comweave/Pipelines_Version2/actions/workflows/github-workflow.yml/dispatches";
//       const workflowInputs = {
//         versioningTool: order.versioningTool,
//         hostingType: order.hostingType,
//         monitoringTool: order.monitoringTool,
//         hostingJarTool: order.hostingJarTool,
//       };
  
//     //   console.log("Dispatching workflow with inputs:", workflowInputs);
  
//       await axios.post(
//         workflowDispatchUrl,
//         {
//           ref: "main", // Branch name
//           inputs: workflowInputs,
//         },
//         {
//           headers: {
//             Authorization: `Bearer ${GITHUBTOKEN}`,
//             Accept: "application/vnd.github.v3+json",
//           },
//         }
//       );
  
//     //   console.log("Workflow triggered successfully.");
  
//       // Poll for the workflow run status
//       const workflowRunsUrl = `https://api.github.com/repos/comweave/Pipelines_Version2/actions/runs`;
//       let latestRun = null;
  
//       for (let attempt = 1; attempt <= 10; attempt++) {
//         // console.log(`Polling for workflow status (attempt ${attempt})...`);
  
//         const { data } = await axios.get(workflowRunsUrl, {
//           headers: {
//             Authorization: `Bearer ${GITHUBTOKEN}`,
//             Accept: "application/vnd.github.v3+json",
//           },
//         });
  
//         latestRun = data.workflow_runs.find(
//           (run) => run.head_branch === "main" && run.status === "completed"
//         );
  
//         if (latestRun) break;
//         await new Promise((resolve) => setTimeout(resolve, 10000));
//       }
  
//       if (!latestRun) {
//         return res.status(500).json({
//           message: "Workflow run not completed.",
//         });
//       }
  
//     //   console.log("Workflow completed:", latestRun);
  
//       // Fetch logs of the `create-repository` job
//       const jobLogsUrl = `https://api.github.com/repos/comweave/Pipelines_Version2/actions/runs/${latestRun.id}/jobs`;
//       const { data: jobDetails } = await axios.get(jobLogsUrl, {
//         headers: {
//           Authorization: `Bearer ${GITHUBTOKEN}`,
//           Accept: "application/vnd.github.v3+json",
//         },
//       });
//       console.log("testttttttttttttttttttttttttt",jobDetails);
      
//       const createRepoJob = jobDetails.jobs.find(
//         (job) => job.name === "create-repository"
//       );
//       console.log("£££££££££££££££££££££££",createRepoJob)
//       if (!createRepoJob) {
//         console.error("Create-repository job not found in workflow run.");
//         return res.status(500).json({
//           message: "Create-repository job not found.",
//         });
//       }
  
  
//       // Check if logs_url is present
//       if (!latestRun.logs_url) {
//         console.error("logs_url is not found in createRepoJob.");
//         return res.status(500).json({
//           message: "logs_url not found in create-repository job details.",
//         });
//       }
  
//       const logUrl = latestRun.logs_url;
//     //   console.log("***************LOGGGGGGGGGGGGGGGGGG",logUrl)

//       const { data: logData } = await axios.get(logUrl, {
//         headers: {
//           Authorization: `Bearer ${GITHUBTOKEN}`,
//           Accept: "application/vnd.github.v3+json",
//         },
//       });

//       // Parse the `repo_url` from logs
//       const repoUrlMatch = logData.match(/Repo URL: (https:\/\/github\.com\/.+)/);
       
//       if (!repoUrlMatch) {
//         return res.status(500).json({
//           message: "Repository URL not found in logs.",
//         });
//       }
//       const repoUrl = repoUrlMatch[1];
//     //   console.log("Repo URL fetched successfully:#####################", repoUrl);
  
//       res.status(200).json({
//         message: "Workflow completed successfully.",
//         repoUrl,
//       });
//     } catch (error) {
//       console.error("Error:", error.message, error.stack);
//       res.status(500).json({
//         message: "An error occurred",
//         error: error.message,

//       });
//     }
//   });
  
app.post("/accept-order/:id", async (req, res) => {
  const result = require("dotenv").config();
  const GITHUBTOKEN = result.parsed.GITHUBTOKEN;

  try {
    const { id } = req.params;

    // Update the order status
    const order = await Order.findByIdAndUpdate(
      id,
      { status: "acceptée" },
      { new: true }
    );

    if (!order) {
      console.error(`Order not found for ID: ${id}`);
      return res.status(404).json({ message: "Order not found" });
    }

    const workflowDispatchUrl =
      "https://api.github.com/repos/Ferielkraiem2000/Pipelines_Version2/actions/workflows/github-workflow.yml/dispatches";
    const workflowInputs = {
      versioningTool: order.versioningTool,
      hostingType: order.hostingType,
      monitoringTool: order.monitoringTool,
      hostingJarTool: order.hostingJarTool,
    };

    await axios.post(
      workflowDispatchUrl,
      {
        ref: "main", // Branch name
        inputs: workflowInputs,
      },
      {
        headers: {
          Authorization: `Bearer ${GITHUBTOKEN}`,
          Accept: "application/vnd.github.v3+json",
        },
      }
    );

    const workflowRunsUrl = `https://api.github.com/repos/Ferielkraiem2000/Pipelines_Version2/actions/runs`;
    let latestRun = null;

    for (let attempt = 1; attempt <= 10; attempt++) {
      const { data } = await axios.get(workflowRunsUrl, {
        headers: {
          Authorization: `Bearer ${GITHUBTOKEN}`,
          Accept: "application/vnd.github.v3+json",
        },
      });

      latestRun = data.workflow_runs.find(
        (run) => run.head_branch === "main" && run.status === "completed"
      );

      if (latestRun) break;
      await new Promise((resolve) => setTimeout(resolve, 10000));
    }

    if (!latestRun) {
      return res.status(500).json({
        message: "Workflow run not completed.",
      });
    }

    const jobLogsUrl = `https://api.github.com/repos/Ferielkraiem2000/Pipelines_Version2/actions/runs/${latestRun.id}/logs`;
    const { data: logData } = await axios.get(jobLogsUrl, {
      headers: {
        Authorization: `Bearer ${GITHUBTOKEN}`,
        Accept: "application/vnd.github.v3+json",
      },
    });

    const repoUrlMatch = logData.match(/Repo URL: (https:\/\/github\.com\/.+)/);
    if (!repoUrlMatch) {
      return res.status(500).json({
        message: "Repository URL not found in logs.",
      });
    }

    const repoUrl = repoUrlMatch[1];

    res.status(200).json({
      message: "Workflow completed successfully.",
      repoUrl,
    });
  } catch (error) {
    console.error("Error:", error.message, error.stack);
    res.status(500).json({
      message: "An error occurred",
      error: error.message,
    });
  }
});

app.delete('/delete-order/:id', async (req, res) => {
    try {
        const { id } = req.params;

        console.log("Deleting order with ID:", id);

        const deletedOrder = await Order.findByIdAndDelete(id);

        if (!deletedOrder) {
            return res.status(404).json({ message: "Order not found" });
        }

        res.status(200).json({
            message: "Order deleted successfully",
            order: deletedOrder,
        });
    } catch (error) {
        console.error("Error deleting order:", error);
        res.status(500).json({ message: "Error deleting order", error: error.message });
    }
});

module.exports = app;
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
  });