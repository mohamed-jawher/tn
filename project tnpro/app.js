
const express = require('express');
const path = require('path');
const mysql = require('mysql2');
const bcrypt = require('bcrypt');

const app = express();

// Connexion à la base de données MySQL
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'tn_m3allim'
});

db.connect((err) => {
    if (err) {
        console.error('Erreur de connexion à la base de données:', err.stack);
        return;
    }
    console.log('Connecté à la base de données MySQL');
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Route principale
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Inscription d'un utilisateur
app.post('/signup', (req, res) => {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role) {
        return res.json({ success: false, message: 'Toutes les informations sont requises' });
    }

    // Vérifier si l'utilisateur existe déjà
    db.query('SELECT * FROM utilisateurs WHERE email = ?', [email], (err, results) => {
        if (err) {
            console.error('Erreur lors de la vérification de l\'email:', err);
            return res.status(500).json({ success: false, message: 'Erreur serveur' });
        }

        if (results.length > 0) {
            return res.json({ success: false, message: 'Cet utilisateur existe déjà !' });
        }

        // Hachage du mot de passe
        bcrypt.hash(password, 10, (err, hashedPassword) => {
            if (err) {
                console.error('Erreur de hachage:', err);
                return res.status(500).json({ success: false, message: 'Erreur serveur' });
            }

            // Insertion dans la base de données
            const query = 'INSERT INTO utilisateurs (nom, email, mot_de_passe, rôle) VALUES (?, ?, ?, ?)';
            db.query(query, [name, email, hashedPassword, role], (err) => {
                if (err) {
                    console.error('Erreur lors de l\'ajout de l\'utilisateur:', err);
                    return res.status(500).json({ success: false, message: 'Erreur serveur' });
                }

                res.json({ success: true, message: 'Utilisateur ajouté avec succès' });
            });
        });
    });
});

// Connexion d'un utilisateur
app.post('/login', (req, res) => {
    const { email, password } = req.body;

    db.query('SELECT * FROM utilisateurs WHERE email = ?', [email], (err, results) => {
        if (err) {
            console.error('Erreur lors de la récupération de l\'utilisateur:', err);
            return res.status(500).json({ success: false, message: 'Erreur serveur' });
        }

        if (results.length === 0) {
            return res.json({ success: false, message: 'Utilisateur non trouvé' });
        }

        const user = results[0];

        // Comparaison du mot de passe
        bcrypt.compare(password, user.mot_de_passe, (err, isMatch) => {
            if (err) {
                console.error('Erreur lors de la comparaison:', err);
                return res.status(500).json({ success: false, message: 'Erreur serveur' });
            }

            if (!isMatch) {
                return res.json({ success: false, message: 'Mot de passe incorrect' });
            }

            // Redirection selon le rôle
            let redirectPage = '';
            if (user.rôle === 'admin') {
                redirectPage = 'admin.html';
            } else if (user.rôle === 'artisan') {
                redirectPage = 'artisan.html';
            } else if (user.rôle === 'client') {
                redirectPage = 'client.html';
            } else {
                return res.json({ success: false, message: 'Rôle non autorisé' });
            }

            res.json({ success: true, redirect: redirectPage });
        });
    });
});

// Route pour traiter les messages de contact
app.post('/contact-us', (req, res) => {
    const { name, email, phone, message } = req.body;

    // Vérification des champs obligatoires
    if (!name || !email || !message) {
        return res.status(400).json({ error: 'Veuillez remplir tous les champs obligatoires.' });
    }

    const sql = 'INSERT INTO enquete (nom, email, num_tel, message) VALUES (?, ?, ?, ?)';
    db.query(sql, [name, email, phone, message], (err, result) => {
        if (err) {
            console.error('❌ Erreur MySQL:', err);
            return res.status(500).json({ error: 'Erreur lors de l\'enregistrement du message.' });
        }
        res.status(200).json({ success: 'Message envoyé avec succès.' });
    });
});


// Route pour récupérer les statistiques
app.get("/admin", (req, res) => {
    const queryTotalUsers = "SELECT COUNT(*) AS total FROM utilisateurs";
    const queryClients = "SELECT COUNT(*) AS clients FROM utilisateurs WHERE `rôle` = 'client'";
    const queryArtisans = "SELECT COUNT(*) AS artisans FROM utilisateurs WHERE `rôle` = 'artisan'";    
    const queryMessages = "SELECT COUNT(*) AS messages FROM enquete";

    db.query(queryTotalUsers, (err, resultTotal) => {
        if (err) {
            console.error("Erreur lors de la récupération du total des utilisateurs :", err);
            return res.status(500).json({ error: "Erreur serveur" });
        }
        db.query(queryClients, (err, resultClients) => {
            if (err) {
                console.error("Erreur lors de la récupération des clients :", err);
                return res.status(500).json({ error: "Erreur serveur" });
            }
            db.query(queryArtisans, (err, resultArtisans) => {
                if (err) {
                    console.error("Erreur lors de la récupération des artisans :", err);
                    return res.status(500).json({ error: "Erreur serveur" });
                }
                db.query(queryMessages, (err, resultMessages) => {
                    if (err) {
                        console.error("Erreur lors de la récupération des messages :", err);
                        return res.status(500).json({ error: "Erreur serveur" });
                    }

                    // Envoyer les résultats
                    res.json({
                        totalUsers: resultTotal[0].total,
                        clients: resultClients[0].clients,
                        artisans: resultArtisans[0].artisans,
                        messages: resultMessages[0].messages
                    });
                });
            });
        });
    });
});




// Route pour récupérer les clients
app.get("/client-list", (req, res) => {
    const sql = "SELECT id, nom, email FROM utilisateurs WHERE rôle = 'client'";
    db.query(sql, (err, result) => {
        if (err) {
            return res.status(500).json({ error: "Erreur lors de la récupération des clients." });
        }
        res.json(result);
    });
});


// Route pour récupérer les artisants
app.get("/artisan-list", (req, res) => {
    const sql = "SELECT id, nom, email FROM utilisateurs WHERE rôle = 'artisan'";
    db.query(sql, (err, result) => {
        if (err) {
            return res.status(500).json({ error: "Erreur lors de la récupération des artisans" });
        }
        res.json(result);
    });
});




// Route pour récupérer les messages
app.get("/user-messages", (req, res) => {
    const sql = "SELECT id, nom, email, num_tel, message, DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') AS created_at FROM enquete ORDER BY created_at DESC";
    
    db.query(sql, (err, results) => {
        if (err) {
            console.error("Erreur lors de la récupération des messages :", err);
            res.status(500).json({ error: "Erreur serveur" });
            return;
        }
        res.json(results);
    });
});




// Récupérer tous les utilisateurs
app.get("/manage-accounts", (req, res) => {
    db.query("SELECT id, nom, email, rôle FROM utilisateurs", (err, results) => {
        if (err) return res.status(500).send(err);
        res.json(results);
    });
});

// Ajouter un utilisateur
app.post("/manage-accounts", async (req, res) => {
    const { nom, email, motDePasse, rôle } = req.body;
    const hashedPassword = await bcrypt.hash(motDePasse, 10);

    db.query(
        "INSERT INTO utilisateurs (nom, email, mot_de_passe, rôle) VALUES (?, ?, ?, ?)",
        [nom, email, hashedPassword, rôle],
        (err, result) => {
            if (err) return res.status(500).send(err);
            res.json({ message: "Utilisateur ajouté", id: result.insertId });
        }
    );
});

// Modifier un utilisateur (sans changer le mot de passe)
app.put("/manage-accounts/:id", (req, res) => {
    const { nom, email, rôle } = req.body;
    const id = req.params.id;

    db.query(
        "UPDATE utilisateurs SET nom = ?, email = ?, rôle = ? WHERE id = ?",
        [nom, email, rôle, id],
        (err, result) => {
            if (err) return res.status(500).send(err);
            res.json({ message: "Utilisateur mis à jour" });
        }
    );
});

// Supprimer un utilisateur
app.delete("/manage-accounts/:id", (req, res) => {
    const id = req.params.id;

    db.query("DELETE FROM utilisateurs WHERE id = ?", [id], (err, result) => {
        if (err) return res.status(500).send(err);
        res.json({ message: "Utilisateur supprimé" });
    });
});




// Définition du port
const port = process.env.PORT || 3001;
app.listen(port, () => {
    console.log(`Serveur démarré sur http://localhost:${port}`);
});
