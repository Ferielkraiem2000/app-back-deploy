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
const Bull = require('bull');

const dotenv = require('dotenv');
app.use(express.json()); 
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
const result=require("dotenv").config();
// const GITHUBTOKEN = result.parsed.GITHUBTOKEN;
const GITHUBTOKEN=process.env.GITHUBTOKEN; 
console.log("*************",GITHUBTOKEN)
const workflowQueue = new Bull('workflowQueue', {
  redis: { host: 'localhost', port: 6379 }, // Use your Redis server details
});

// app.post("/accept-order/:id", async (req, res) => {
//   try {
//     const { id } = req.params;

//     const order = await Order.findByIdAndUpdate(
//       id,
//       { status: "acceptée" },
//       { new: true }
//     );

//     if (!order) {
//       console.error(`Order not found for ID: ${id}`);
//       return res.status(404).json({ message: "Order not found" });
//     }

//     let workflowDispatchUrl = "https://api.github.com/repos/Ferielkraiem2000/Pipelines_Version2/actions/workflows/github-workflow.yml/dispatches";
//     let workflowRunsUrl = `https://api.github.com/repos/Ferielkraiem2000/Pipelines_Version2/actions/runs`;

//     if (
//       (order.versioningTool === "Gitlab" || order.versioningTool === "Azure DevOps") &&
//       order.hostingType === "On-Premises"
//     ) {
//       workflowDispatchUrl = "https://api.github.com/repos/Ferielkraiem2000/V2_PlanB_Azure_Gitlab_ONP/actions/workflows/github-workflow.yml/dispatches";
//       workflowRunsUrl = `https://api.github.com/repos/Ferielkraiem2000/V2_PlanB_Azure_Gitlab_ONP/actions/runs`;
//     }

//     const workflowInputs = {
//       versioningTool: order.versioningTool,
//       hostingType: order.hostingType,
//       monitoringTool: order.monitoringTool,
//       hostingJarTool: order.hostingJarTool,
//     };

//     try {
//       // const postRequestTime = new Date().toISOString();
//       // console.log(new Date(postRequestTime).getTime());
//       //trigger workflow
//       await axios.post(
//         workflowDispatchUrl,
//         {
//           ref: "main",
//           inputs: workflowInputs,
//         },
//         {
//           headers: {
//             Authorization: `Bearer ${GITHUBTOKEN}`,
//             Accept: "application/vnd.github.v3+json",
//           },
//         }
//       );

//       let latestRun = null;
//       const maxAttempts = 15;
//       console.log(maxAttempts);
      
//       for (let attempt = 1; attempt <= maxAttempts; attempt++) {
//         console.log(`Checking workflow status, attempt ${attempt}...`);

//         const { data } = await axios.get(workflowRunsUrl, {
//           headers: {
//             Authorization: `Bearer ${GITHUBTOKEN}`,
//             Accept: "application/vnd.github.v3+json",
//           },
//         });

//         latestRun = data.workflow_runs
//           .filter(
//             (run) =>
//               run.head_branch === "main" &&
//               run.status === "completed" &&
//               run.conclusion === "success" &&
//               run.name === "Create Temporary GitHub Repository for Client" 
//               // new Date(run.run_started_at).getTime() >= new Date(postRequestTime).getTime()
//             ).sort((a, b) => new Date(b.run_started_at) - new Date(a.run_started_at))[0];
        
//         console.log("latestRun",latestRun);
//         if (latestRun) {
//           console.log("Workflow completed successfully.");
//         }
//       }
//     const reposUrl = "https://api.github.com/user/repos";
//     const { data: repos } = await axios.get(reposUrl, {
//       headers: {
//         Authorization: `Bearer ${GITHUBTOKEN}`,
//         Accept: "application/vnd.github.v3+json",
//       },
//     });
//     const filteredRepos = repos.filter((repo) => repo.name.includes("temp-repo"));
//     if (filteredRepos.length === 0) {
//       return res.status(404).json({
//         message: "No temporary repository found." + JSON.stringify(latestRun),
//       });
//     }
//     const latestRepo = filteredRepos.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
//     const repoUrl = latestRepo.html_url;
//     return res.status(200).json({
//       message: "Workflow completed successfully.",
//       repoUrl,
//     });  
//   } catch (error) {
//       console.error("Error during workflow execution:", error.message, error.stack);
//       return res.status(500).json({
//         message: "An error occurred during the workflow execution.",
//         error: error.message,
//       });
//     }
//   } catch (error) {
//     console.error("Error while processing the order:", error.message, error.stack);
//     return res.status(500).json({
//       message: "An error occurred while processing the order.",
//       error: error.message,
//     });
//   }
// });
// POST route to accept order and trigger the workflow
app.post("/accept-order/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Find and update the order status
    const order = await Order.findByIdAndUpdate(id, { status: "acceptée" }, { new: true });

    if (!order) {
      console.error(`Order not found for ID: ${id}`);
      return res.status(404).json({ message: "Order not found" });
    }

    // Determine the appropriate workflow dispatch URL
    let workflowDispatchUrl = "https://api.github.com/repos/Ferielkraiem2000/Pipelines_Version2/actions/workflows/github-workflow.yml/dispatches";
    let workflowRunsUrl = `https://api.github.com/repos/Ferielkraiem2000/Pipelines_Version2/actions/runs`;

    if (order.versioningTool === "Gitlab" || order.versioningTool === "Azure DevOps" && order.hostingType === "On-Premises") {
      workflowDispatchUrl = "https://api.github.com/repos/Ferielkraiem2000/V2_PlanB_Azure_Gitlab_ONP/actions/workflows/github-workflow.yml/dispatches";
      workflowRunsUrl = `https://api.github.com/repos/Ferielkraiem2000/V2_PlanB_Azure_Gitlab_ONP/actions/runs`;
    }

    const workflowInputs = {
      versioningTool: order.versioningTool,
      hostingType: order.hostingType,
      monitoringTool: order.monitoringTool,
      hostingJarTool: order.hostingJarTool,
    };

    // Trigger the workflow asynchronously
    await axios.post(
      workflowDispatchUrl,
      { ref: "main", inputs: workflowInputs },
      {
        headers: {
          Authorization: `Bearer ${GITHUBTOKEN}`,
          Accept: "application/vnd.github.v3+json",
        },
      }
    );

    // Add a job to the queue to process workflow completion
    workflowQueue.add({ orderId: order.id, workflowRunsUrl });

    // Respond immediately to the client
    return res.status(200).json({
      message: "Order accepted and workflow triggered. You will be notified once the workflow completes.",
    });

  } catch (error) {
    console.error("Error while processing the order:", error.message, error.stack);
    return res.status(500).json({
      message: "An error occurred while processing the order.",
      error: error.message,
    });
  }
});

// Define a job processor for the queue to handle the background tasks
workflowQueue.process(async (job) => {
  const { orderId, workflowRunsUrl } = job.data;

  try {
    // Fetch order details
    const order = await Order.findById(orderId);
    if (!order) {
      console.error(`Order not found for ID: ${orderId}`);
      return;
    }

    // Fetch the workflow runs
    const { data } = await axios.get(workflowRunsUrl, {
      headers: {
        Authorization: `Bearer ${GITHUBTOKEN}`,
        Accept: "application/vnd.github.v3+json",
      },
    });

    // Get the latest completed successful workflow run
    const latestRun = data.workflow_runs
      .filter(run => run.head_branch === "main" && run.status === "completed" && run.conclusion === "success")
      .sort((a, b) => new Date(b.run_started_at) - new Date(a.run_started_at))[0];

    if (!latestRun) {
      console.log("Workflow still in progress...");
      return;
    }

    console.log("Workflow completed successfully. Latest run:", latestRun);

    // Fetch repositories to find the temporary repository
    const reposUrl = "https://api.github.com/user/repos";
    const { data: repos } = await axios.get(reposUrl, {
      headers: {
        Authorization: `Bearer ${GITHUBTOKEN}`,
        Accept: "application/vnd.github.v3+json",
      },
    });

    const filteredRepos = repos.filter((repo) => repo.name.includes("temp-repo"));

    if (filteredRepos.length === 0) {
      console.error("No temporary repository found.");
      return;
    }

    // Get the latest temporary repository
    const latestRepo = filteredRepos.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
    const repoUrl = latestRepo.html_url;

    // Optionally, update the order status with the repo URL
    await Order.findByIdAndUpdate(orderId, { repoUrl });

    console.log("Repo URL:", repoUrl);

    // Send notifications or updates if needed

  } catch (error) {
    console.error("Error processing workflow status:", error.message);
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

// const server=app.listen(port, () => {
//     console.log(`Server is running on http://localhost:${port}`);
//   });
  // server.setTimeout(240000); // 120 seconds
