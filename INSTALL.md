# Guide d'installation — R4 Survey

## 1. Prérequis

- Apache 2.4+ avec `mod_rewrite`, `mod_headers`, `mod_authz_core`, `mod_expires`
- PHP 8.1+ avec PDO et PDO_MySQL
- MySQL / MariaDB 10.5+

---

## 2. Installation de la base de données

Importer le script unique :

```bash
mysql -u root -p < database/install.sql
```

Ou depuis phpMyAdmin : importer `database/install.sql`.

---

## 3. Configuration de l'environnement

```bash
cp .env.example .env
nano .env
```

Remplir les valeurs :

```env
DB_HOST=localhost
DB_NAME=r4_survey
DB_USER=votre_user_db
DB_PASS=votre_mot_de_passe_db
DB_CHARSET=utf8mb4
```

---

## 4. Sécurisation post-installation

### 4a. Changer les comptes par défaut (B3)

Les comptes créés par `install.sql` ont les mots de passe `user/user` et `admin/admin`.
**À remplacer immédiatement** via la BDD ou en ajoutant une route admin dédiée.

```sql
-- Changer le mot de passe admin (remplacer le hash par un vrai bcrypt)
UPDATE users SET password_hash = '$2y$12$...' WHERE username = 'admin';
-- Supprimer le compte 'user' de démonstration
DELETE FROM users WHERE username = 'user';
```

Pour générer un hash PHP :
```php
echo password_hash('mon_nouveau_mot_de_passe', PASSWORD_DEFAULT);
```

### 4b. Supprimer le script de setup (B5)

```bash
rm database/setup.php
```

### 4c. Activer HTTPS (B9)

Dans `.htaccess`, décommenter le bloc suivant :

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteCond %{HTTPS} off
  RewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [R=301,L]
</IfModule>
```

---

## 5. Configuration du vhost Apache

```apache
<VirtualHost *:443>
    ServerName votredomaine.fr
    DocumentRoot /var/www/r4

    SSLEngine on
    SSLCertificateFile    /etc/ssl/certs/votredomaine.crt
    SSLCertificateKeyFile /etc/ssl/private/votredomaine.key

    <Directory /var/www/r4>
        AllowOverride All
        Require all granted
    </Directory>

    ErrorLog  ${APACHE_LOG_DIR}/r4_error.log
    CustomLog ${APACHE_LOG_DIR}/r4_access.log combined
</VirtualHost>
```

---

## 6. Checklist avant mise en ligne

- [ ] `.env` rempli avec les credentials de production
- [ ] Mot de passe DB non vide et sécurisé (B2)
- [ ] Comptes `user/user` et `admin/admin` supprimés ou modifiés (B3)
- [ ] `database/setup.php` supprimé (B5)
- [ ] HTTPS activé dans `.htaccess` (B9)
- [ ] Test bout en bout : parcours invité, parcours connecté, admin
- [ ] Vérification des logs PHP (`error_log` configuré)
