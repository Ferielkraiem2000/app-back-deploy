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


// // Accept order and trigger GitHub workflow
// app.post("/accept-order/:id", async (req, res) => {
//     const { id } = req.params;

//     try {
//         const order = await Order.findById(id);
//         if (!order) {
//             return res.status(404).json({ message: "Order not found" });
//         }

//         order.status = "acceptée";
//         await order.save();

//         const GITHUB_TOKEN = "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"; 
//         const workflowDispatchURL = `https://api.github.com/repos/comweave/Pipelines_Version2/actions/workflows/github-workflow.yml/dispatches`;

//         await axios.post(
//             workflowDispatchURL,
//             {
//                 ref: "main",
//                 inputs: {
//                     config: JSON.stringify({
//                         versioningTool: order.versioningTool,
//                         hostingType: order.hostingType,
//                         monitoringTool: order.monitoringTool,
//                         hostingJarTool: order.hostingJarTool,
//                     }),
//                 },
//             },
//             {
//                 headers: {
//                     Authorization: `Bearer ${GITHUB_TOKEN}`,
//                     Accept: "application/vnd.github.v3+json",
//                 },
//             }
//         );

//         res.status(200).json({ message: "Order accepted and workflow triggered successfully!",   repoUrl, });
//     } catch (error) {
//         console.error("Error accepting order:", error.message);
//         res.status(500).json({ message: "Error accepting order", error: error.message });
//     }
// });

app.post('/accept-order/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const order = await Order.findByIdAndUpdate(
            id,
            { status: "acceptée" },
            { new: true }
        );

        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        const workflowDispatchUrl = `https://api.github.com/repos/comweave/Pipelines_Version2/actions/workflows/github-workflow.yml/dispatches`;
        const GITHUB_TOKEN = "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"; 

        const workflowInputs = {
            versioningTool: order.versioningTool,
            hostingType: order.hostingType,
            monitoringTool: order.monitoringTool,
            hostingJarTool: order.hostingJarTool,
        };

        await axios.post(
            workflowDispatchUrl,
            {
                ref: "main",
                inputs: workflowInputs,
            },
            {
                headers: {
                    Authorization: `token ${GITHUB_TOKEN}`,
                    Accept: "application/vnd.github.v3+json",
                },
            }
        );

        const workflowRunsUrl = `https://api.github.com/repos/comweave/Pipelines_Version2/actions/runs`;
        let repoUrl = null;

        for (let i = 0; i < 10; i++) {
            const { data } = await axios.get(workflowRunsUrl, {
                headers: {
                    Authorization: `token ${GITHUB_TOKEN}`,
                    Accept: "application/vnd.github.v3+json",
                },
            });
            console.log(data)
            const latestRun = data.workflow_runs.find(
                (run) => run.head_branch === "main" && run.status === "completed"
            );

            if (latestRun) {
                const runId = latestRun.id;
                const runDetailsUrl = `https://api.github.com/repos/comweave/Pipelines_Version2/actions/runs/${runId}/jobs`;

                const runDetails = await axios.get(runDetailsUrl, {
                    headers: {
                        Authorization: `token ${GITHUB_TOKEN}`,
                        Accept: "application/vnd.github.v3+json",
                    },
                });

                repoUrl = runDetails.data.jobs[0].steps.find(
                    (step) => step.name === "Create Repository"
                ).output.repo_url;

                break;
            }

            await new Promise((resolve) => setTimeout(resolve, 5000));
        }

        if (!repoUrl) {
            return res.status(500).json({
                message: "Failed to fetch repository URL from workflow",
            });
        }

        res.status(200).json({
            message: "Order accepted and repository created",
            repoUrl,
        });
    } catch (error) {
        console.error("Error accepting order:", error.message);
        res.status(500).json({ message: "Error accepting order", error: error.message });
    }
});
module.exports = app;
