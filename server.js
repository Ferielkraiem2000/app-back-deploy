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
require("dotenv").config();
// const GITHUBTOKEN = result.parsed.GITHUBTOKEN;
const GITHUBTOKEN=process.env.GITHUBTOKEN; 
console.log("*************",GITHUBTOKEN)



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

//     const workflowDispatchUrl =
//       "https://api.github.com/repos/Ferielkraiem2000/Pipelines_Version2/actions/workflows/github-workflow.yml/dispatches";

//     const workflowInputs = {
//       versioningTool: order.versioningTool,
//       hostingType: order.hostingType,
//       monitoringTool: order.monitoringTool,
//       hostingJarTool: order.hostingJarTool,
//     };

//     try {
//       // Trigger the workflow
//       const dispatchResponse = await axios.post(
//         workflowDispatchUrl,
//         {
//           ref: "main", // Branch to run the workflow on
//           inputs: workflowInputs,
//         },
//         {
//           headers: {
//             Authorization: `Bearer ${GITHUBTOKEN}`,
//             Accept: "application/vnd.github.v3+json",
//           },
//         }
//       );

//       console.log("Workflow triggered successfully.");

//       const workflowRunsUrl = `https://api.github.com/repos/Ferielkraiem2000/Pipelines_Version2/actions/runs`;

//       let latestRun = null;
//       let attempt = 0;
//       const maxAttempts = 30;

//       while (attempt < maxAttempts) {
//         attempt++;
//         console.log(`Checking workflow status, attempt ${attempt}...`);
//         const { data } = await axios.get(workflowRunsUrl, {
//           headers: {
//             Authorization: `Bearer ${GITHUBTOKEN}`,
//             Accept: "application/vnd.github.v3+json",
//           },
//         });

//         const filteredRuns = data.workflow_runs.filter(
//           (run) =>
//             run.head_branch === "main" &&
//             run.status === "completed" &&
//             run.conclusion === "success"
//         );

//         latestRun = filteredRuns.sort(
//           (a, b) => new Date(b.created_at) - new Date(a.created_at)
//         )[0];

//         if (latestRun) {
//           console.log("Workflow completed successfully.");
//           console.log("Fetching temporary repository information...");

//           // Fetch repositories once the workflow is completed
//           const reposUrl = "https://api.github.com/user/repos";

//           const { data: repos } = await axios.get(reposUrl, {
//             headers: {
//               Authorization: `Bearer ${GITHUBTOKEN}`,
//               Accept: "application/vnd.github.v3+json",
//             },
//           });

//           // Find temporary repo
//           const filteredRepos = repos.filter((repo) => repo.name.includes("temp-repo"));

//           if (filteredRepos.length === 0) {
//             return res.status(404).json({
//               message: "No temporary repository found.",
//             });
//           }

//           const latestRepo = filteredRepos.sort(
//             (a, b) => new Date(b.created_at) - new Date(a.created_at)
//           )[0];
//           const repoUrl = latestRepo.html_url;

//           // Return response with the repository URL
//           return res.status(200).json({
//             message: "Workflow completed successfully.",
//             repoUrl,
//           });
//         }

//         // Wait for 10 seconds before retrying
//         await new Promise((resolve) => setTimeout(resolve, 10000));
//       }

//       // If no successful run found within the attempts limit
//       return res.status(500).json({
//         message: "The workflow did not complete within the timeout limit.",
//       });

//     } catch (error) {
//       console.error("Error:", error.message, error.stack);
//       res.status(500).json({
//         message: "An error occurred during the workflow execution.",
//         error: error.message,
//       });
//     }
//   } catch (error) {
//     console.error("Error:", error.message, error.stack);
//     res.status(500).json({
//       message: "An error occurred while processing the order.",
//       error: error.message,
//     });
//   }
// });


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
//     const workflowDispatchUrl =
//     "https://api.github.com/repos/Ferielkraiem2000/Pipelines_Version2/actions/workflows/github-workflow.yml/dispatches";
  
//   const workflowInputs = {
//     versioningTool: order.versioningTool,
//     hostingType: order.hostingType,
//     monitoringTool: order.monitoringTool,
//     hostingJarTool: order.hostingJarTool,
//   };
  
//   try {
//     // Déclencher le workflow
//     const dispatchResponse = await axios.post(
//       workflowDispatchUrl,
//       {
//         ref: "main", // Branche sur laquelle exécuter le workflow
//         inputs: workflowInputs,
//       },
//       {
//         headers: {
//           Authorization: `Bearer ${GITHUBTOKEN}`,
//           Accept: "application/vnd.github.v3+json",
//         },
//       }
//     );
  
//     console.log("Workflow déclenché avec succès.");
  
//     const workflowRunsUrl = `https://api.github.com/repos/Ferielkraiem2000/Pipelines_Version2/actions/runs`;
  
//     let latestRun = null;
//     let attempt = 0;
//     const maxAttempts = 30;
  
//     while (attempt < maxAttempts) {
//       attempt++;
//       console.log(`Vérification de l'état du workflow, tentative ${attempt}...`);
//       const { data } = await axios.get(workflowRunsUrl, {
//         headers: {
//           Authorization: `Bearer ${GITHUBTOKEN}`,
//           Accept: "application/vnd.github.v3+json",
//         }
//       });
  
//       // const sortedRuns = data.workflow_runs.sort(
//       //   (a, b) => new Date(b.created_at) - new Date(a.created_at)
//       // );
      
//       filteredRuns = data.workflow_runs.filter(
//         (run) =>
//           run.head_branch === "main" &&
//           run.status === "completed" &&
//           run.conclusion === "success"
//       );
//       const latestRun = filteredRuns.sort(
//         (a, b) => new Date(b.created_at) - new Date(a.created_at)
//       )[0];
//       // latestRun = sortedRuns.find(
//       //   (run) =>
//       //     run.head_branch === "main" &&
//       //     run.status === "completed" &&
//       //     run.conclusion === "success"
//       // );
//       console.log(latestRun)
//       // if (latestRun) {
//       //   console.log("Workflow terminé avec succès.");
//       //   break;
//       // }
//       // Attendre 10 secondes avant de réessayer
//       // await new Promise((resolve) => setTimeout(resolve, 10000));
//     }
  
//     // if (!latestRun) {
//     //   return res.status(500).json({
//     //     message: "Le workflow n'a pas terminé dans le délai imparti.",
//     //   });
//     // }
  
//     console.log("Récupération des informations du dépôt temporaire...");
//     // await new Promise((resolve) => setTimeout(resolve, 20000)); //100 secondes
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
//         message: "Aucun dépôt temporaire trouvé.",
//       });
//     }
  
//     const latestRepo = filteredRepos.sort(
//       (a, b) => new Date(b.created_at) - new Date(a.created_at)
//     )[0];
//     const repoUrl = latestRepo.html_url;
  
//     res.status(200).json({
//       message: "Workflow terminé avec succès.",
//       repoUrl,
//     });
//   } catch (error) {
//     console.error("Erreur:", error.message, error.stack);
//     res.status(500).json({
//       message: "Une erreur est survenue.",
//       error: error.message,
//     });
//   }
  
//   //   const workflowDispatchUrl ="https://api.github.com/repos/Ferielkraiem2000/Pipelines_Version2/actions/workflows/github-workflow.yml/dispatches";
//   //   const workflowInputs = {
//   //     versioningTool: order.versioningTool,
//   //     hostingType: order.hostingType,
//   //     monitoringTool: order.monitoringTool,
//   //     hostingJarTool: order.hostingJarTool,
//   //   };

//   //   const dispatchResponse = await axios.post(
//   //     workflowDispatchUrl,
//   //     {
//   //       ref: "main", // Branch name
//   //       inputs: workflowInputs,
//   //     },
//   //     {
//   //       headers: {
//   //         Authorization: `Bearer ${GITHUBTOKEN}`,
//   //         Accept: "application/vnd.github.v3+json",
//   //       },
//   //     }
//   //   );
//   //   const workflowRunId = dispatchResponse.workflow_run.id;
//   //   console.log("Triggered Workflow Run ID:", workflowRunId);
//   //   const workflowRunsUrl = `https://api.github.com/repos/Ferielkraiem2000/Pipelines_Version2/actions/runs`;
//   //   let latestRun = null;

//   //   for (let attempt = 1; attempt <= 10; attempt++) {
//   //     const { data } = await axios.get(workflowRunsUrl, {
//   //       headers: {
//   //         Authorization: `Bearer ${GITHUBTOKEN}`,
//   //         Accept: "application/vnd.github.v3+json",
//   //       },
//   //     });

//   //     latestRun = data.workflow_runs.find(
//   //       (run) => run.id === workflowRunId && run.head_branch === "main" && run.status === "completed"
//   //     );
//   //     console.log(latestRun);
      
//   //     if (latestRun) break;
//   //     await new Promise((resolve) => setTimeout(resolve, 10000));
      
//   //   }
//   //   if (!latestRun) {
//   //     return res.status(500).json({
//   //       message: "Workflow run not completed.",
//   //     });
//   //   }

//   //   // const jobLogsUrl = `https://api.github.com/repos/Ferielkraiem2000/Pipelines_Version2/actions/runs/${latestRun.id}/logs`;
//   //   // const { data: logData } = await axios.get(jobLogsUrl, {
//   //   //   headers: {
//   //   //     Authorization: `Bearer ${GITHUBTOKEN}`,
//   //   //     Accept: "application/json",
//   //   //     "X-GitHub-Api-Version": "2022-11-28",
//   //   //   },
//   //   // }); 
//   //   // // const octokit = new Octokit({
//   //   // //   auth:`${GITHUBTOKEN}`
//   //   // // })
    
//   //   // // const { data: logData } = await octokit.rest.actions.listWorkflowRunLogs({
//   //   // //   owner: 'Ferielkraiem2000',
//   //   // //   repo: 'Pipelines_Version2',
//   //   // //   run_id: latestRun.id,
//   //   // // });
//   //   // console.log(logData)
//   //   // // const decodedData = Buffer.from(logData, 'hex');
//   //   // // const decompressed = zlib.inflateSync(decodedData);
//   //   // // const result = decompressed.toString('utf-8');
//   //   // // console.log("Contenu décompressé :", result);
//   //   // const repoUrlMatch = logData.match(/Repo URL: (https:\/\/github\.com\/.+)/);
//   //   // if (!repoUrlMatch) {
//   //   //   return res.status(500).json({
//   //   //     message: "Repository URL not found in logs.",
//   //   //   });
//   //   // }

//   //   // const repoUrl = repoUrlMatch[1];
//   //   // Fetch the list of repositories and get the latest one by created_at
//   //   const reposUrl = "https://api.github.com/user/repos"; // This gets repositories for the authenticated user
//   //   const { data: repos } = await axios.get(reposUrl, {
//   //     headers: {
//   //       Authorization: `Bearer ${GITHUBTOKEN}`,
//   //       Accept: "application/vnd.github.v3+json",
//   //     },
//   //   });

//   //   if (repos.length === 0) {
//   //     return res.status(500).json({
//   //       message: "No repositories found.",
//   //     });
//   //   }
//   //   const filteredRepos = repos.filter(repo => repo.name.includes("temp-repo"));

//   //   if (filteredRepos.length === 0) {
//   //     return res.status(404).json({
//   //       message: "No repository with 'temp-repo' in its name was found.",
//   //     });
//   //   }
    
//   //   const latestRepo = filteredRepos.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
//   //   const repoUrl = latestRepo.html_url; 
//   //   console.log("$$$$$$$$$$$$",repoUrl)
//   //   res.status(200).json({
//   //     message: "Workflow completed successfully.",
//   //     repoUrl,
//   //   });
//   //   // res.status(200).json({
//   //   //   message: "Workflow completed successfully.",
//   //   //   repoUrl,
//   //   // });
//   } catch (error) {
//     console.error("Error:", error.message, error.stack);
//     res.status(500).json({
//       message: "An error occurred",
//       error: error.message,
//     });
//    }
// });
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
      (order.versioningTool === "Gitlab" || order.versioningTool === "Azure DevOps") &&
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
      const postRequestTime = new Date().toISOString(); 
      const dispatchResponse = await axios.post(
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
      let attempt = 0;
      const maxAttempts = 30;
      while (attempt < maxAttempts) {
        attempt++;
        console.log(`Checking workflow status, attempt ${attempt}...`);
        const { data } = await axios.get(workflowRunsUrl, {
          headers: {
            Authorization: `Bearer ${GITHUBTOKEN}`,
            Accept: "application/vnd.github.v3+json",
          },
        });

        latestRun = data.workflow_runs.filter(
          (run) =>
            run.head_branch === "main" &&
            run.status === "completed" &&
            run.conclusion === "success" &&
            new Date(run.run_started_at) >= new Date(postRequestTime)
          );

        // latestRun = filteredRuns.sort(
        //   (a, b) => new Date(b.created_at) - new Date(a.created_at)
        // )[0];

        if (latestRun) {
          console.log("Workflow completed successfully.");
          console.log("Fetching temporary repository information...");

          // Fetch repositories once the workflow is completed
          const reposUrl = "https://api.github.com/user/repos";

          const { data: repos } = await axios.get(reposUrl, {
            headers: {
              Authorization: `Bearer ${GITHUBTOKEN}`,
              Accept: "application/vnd.github.v3+json",
            },
          });

          // Find temporary repo
          const filteredRepos = repos.filter((repo) => repo.name.includes("temp-repo"));

          if (filteredRepos.length === 0) {
            return res.status(404).json({
              message: "No temporary repository found."+ latestRun,
            });
          }

          const latestRepo = filteredRepos.sort(
            (a, b) => new Date(b.created_at) - new Date(a.created_at)
          )[0];
          const repoUrl = latestRepo.html_url;

          // Return response with the repository URL
          return res.status(200).json({
            message: "Workflow completed successfully.",
            repoUrl,
          });
        }

        // Wait for 10 seconds before retrying
        await new Promise((resolve) => setTimeout(resolve, 10000));
      }

      // If no successful run found within the attempts limit
      return res.status(500).json({
        message: "The workflow did not complete within the timeout limit.",
      });

    } catch (error) {
      console.error("Error:", error.message, error.stack);
      res.status(500).json({
        message: "An error occurred during the workflow execution."+order.hostingType,
        error: error.message,
      });
    }
  } catch (error) {
    console.error("Error:", error.message, error.stack);
    res.status(500).json({
      message: "An error occurred while processing the order.",
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
// app.listen(port, () => {
//     console.log(`Server is running on http://localhost:${port}`);
//   });