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
const crypto = require('crypto');
const JWT_SECRET = crypto.randomBytes(64).toString('hex');
const jwt = require('jsonwebtoken');
console.log("JWT_SECRET:",JWT_SECRET);

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
const verifyToken = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  console.log("token",token);
  
  if (!token) {
    return res.status(403).json({ message: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log("userid",decoded)

    req.userId = decoded.id; 
    next();
  } catch (err) {
    return res.status(400).json({ message: 'Invalid token', error: err.message });
  }
};


app.post('/signin', async (req, res) => {
  const { workEmail, password } = req.body;

  if (!workEmail || !password) {
    return res.status(400).json({ message: 'Email et mot de passe sont obligatoires' });
  }

  try {
    const user = await User.findOne({ workEmail });
    const token = jwt.sign(
      { id: user._id, workEmail: user.workEmail },
      JWT_SECRET,
      { expiresIn: '1h' }  
    );
    console.log("**",token)
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur introuvable' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Mot de passe incorrect' });
    }

    res.status(200).json({
      message: 'Connexion réussie',
      token, 
    });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

app.get('/profile', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    console.log("req",user) 
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});



app.post('/save-order', async (req, res) => {
    const {versioningTool, hostingType, monitoringTool, hostingJarTool,status,customerId} = req.body;
    console.log(req)
    const order = new Order({
        versioningTool,
        hostingType,
        monitoringTool,
        hostingJarTool,
        status: status || "en attente",
        customerId,
    });
    await order.save();
    res.status(201).send({ message: "Order saved successfully!"});
  });

app.get("/orders", async (req, res) => {

    try {
      // const orders = await Order.find();
      const orders = await Order.find().populate("customerId", "name -_id");
      console.log(orders)
      res.json(orders);
    } catch (error) {
      res.status(500).json({ message: "Error fetching orders", error });
    }
  });  
app.get("/customer/:customerId", async (req, res) => {
    try {
      const { customerId } = req.params;
  
      const customer = await User.findById(customerId, 'name'); // Fetch only the 'name' field
      console.log(customer)
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
  
      res.json({ customerName: customer.name });
    } catch (error) {
      console.error("Error fetching customer:", error);
      res.status(500).json({ message: "Error fetching customer", error });
    }
  });
  
// app.get("/orders", async (req, res) => {
//   try {
//     // Fetch orders and populate customerId with the name of the customer
//     const orders = await Order.find()
//       .populate("customerId", "name") // Populate only the 'name' of the customer
//       .exec(); // Execute the query

//     // Send the orders with the customer name in the response
//     res.json(orders);
//   } catch (error) {
//     res.status(500).json({ message: "Error fetching orders", error });
//   }
// });

const result=require("dotenv").config();
// const GITHUBTOKEN = result.parsed.GITHUBTOKEN;
const GITHUBTOKEN=process.env.GITHUBTOKEN; 
app.get('/client-orders/:customerId', verifyToken, async (req, res) => {
  try {
      const { customerId } = req.params; // Get customerId from the URL parameter
      const orders = await Order.find({ customerId }).sort({ createdAt: -1 });

      if (orders.length === 0) {
          return res.status(404).json({ message: 'No orders found for this customer.' });
      }

      res.status(200).json({ orders });
  } catch (err) {
      res.status(500).json({ message: 'Error retrieving order history', error: err.message });
  }
});
app.post("/accept-order/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const order = await Order.findByIdAndUpdate(
      id,
      { status: "acceptée" },
      { new: true }
    );

    if (!order) {
      console.error(`Order not found for ID: ${id}`);
      return res.status(404).json({ message: "Order not found" });
    }

    let workflowDispatchUrl = "https://api.github.com/repos/Ferielkraiem2000/Pipelines_Version2/actions/workflows/github-workflow.yml/dispatches";
    let workflowRunsUrl = `https://api.github.com/repos/Ferielkraiem2000/Pipelines_Version2/actions/runs`;

    if (
      (order.versioningTool === "Gitlab" || order.versioningTool === "AzureDevOps") &&
      order.hostingType === "On-Premises"
    ) {
      workflowDispatchUrl = "https://api.github.com/repos/Ferielkraiem2000/V2_PlanB_Azure_Gitlab_ONP/actions/workflows/github-workflow.yml/dispatches";
      workflowRunsUrl = `https://api.github.com/repos/Ferielkraiem2000/V2_PlanB_Azure_Gitlab_ONP/actions/runs`;
    }

    const workflowInputs = {
      versioningTool: order.versioningTool,
      hostingType: order.hostingType,
      monitoringTool: order.monitoringTool,
      hostingJarTool: order.hostingJarTool,
    };

    try {
      // const postRequestTime = new Date().toISOString();
      // console.log(new Date(postRequestTime).getTime());
      //trigger workflow
      await axios.post(
        workflowDispatchUrl,
        {
          ref: "main",
          inputs: workflowInputs,
        },
        {
          headers: {
            Authorization: `Bearer ${GITHUBTOKEN}`,
            Accept: "application/vnd.github.v3+json",
          },
        }
      );

      let latestRun = null;
      const maxAttempts = 15;
      console.log(maxAttempts);
      
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        console.log(`Checking workflow status, attempt ${attempt}...`);

        const { data } = await axios.get(workflowRunsUrl, {
          headers: {
            Authorization: `Bearer ${GITHUBTOKEN}`,
            Accept: "application/vnd.github.v3+json",
          },
        });

        latestRun = data.workflow_runs
          .filter(
            (run) =>
              run.head_branch === "main" &&
              run.status === "completed" &&
              run.conclusion === "success" &&
              run.name === "Create Temporary GitHub Repository for Client" 
              // new Date(run.run_started_at).getTime() >= new Date(postRequestTime).getTime()
            ).sort((a, b) => new Date(b.run_started_at) - new Date(a.run_started_at))[0];
        
        console.log("latestRun",latestRun);
        if (latestRun) {
          console.log("Workflow completed successfully.");
        }
      }
    const reposUrl = "https://api.github.com/user/repos";
    const { data: repos } = await axios.get(reposUrl, {
      headers: {
        Authorization: `Bearer ${GITHUBTOKEN}`,
        Accept: "application/vnd.github.v3+json",
      },
    });
    const filteredRepos = repos.filter((repo) => repo.name.includes("temp-repo"));
    if (filteredRepos.length === 0) {
      return res.status(404).json({
        message: "No temporary repository found." + JSON.stringify(latestRun),
      });
    }
    const latestRepo = filteredRepos.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
    const repoUrl = latestRepo.html_url;
    return res.status(200).json({
      message: "Workflow completed successfully.",
      repoUrl,
    });  
  } catch (error) {
      console.error("Error during workflow execution:", error.message, error.stack);
      return res.status(500).json({
        message: "An error occurred during the workflow execution.",
        error: error.message,
      });
    }
  } catch (error) {
    console.error("Error while processing the order:", error.message, error.stack);
    return res.status(500).json({
      message: "An error occurred while processing the order.",
      error: error.message,
    });
  }
});

app.delete('/delete-order/:id', async (req, res) => {
    try {
      
        const { id } = req.params;

        const order = await Order.findByIdAndUpdate(
          id,
          { status: "annulée" },
          { new: true }
        );
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

  // server.setTimeout(240000); // 120 seconds
