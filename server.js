const express = require('express');
const app = express();
const port = 4000;
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const connectDB = require('./db');
const User = require('./models/user');
const Order = require('./models/order');

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
    const { versioningTool, hostingType, monitoringTool, hostingJarTool } = req.body;
    const order = new Order({
        versioningTool,
        hostingType,
        monitoringTool,
        hostingJarTool,
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
// app.listen(port, () => {
//     console.log(`Server running at http://localhost:${port}/`);
//   });
module.exports = app;
