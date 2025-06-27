import mysql.connector
from dotenv import load_dotenv
import os
import bcrypt

# Carrega variáveis do .env
load_dotenv()

# Conecta ao banco de dados
conn = mysql.connector.connect(
    host=os.getenv("DB_HOST"),
    user=os.getenv("DB_USER"),
    password=os.getenv("DB_PASSWORD"),
    database=os.getenv("DB_NAME")
)
cursor = conn.cursor()

# 🧠 Função para criar usuário
def create_user():
    print("=== CADASTRAR NOVO USUÁRIO ===")
    nome = input("Nome completo: ")
    email = input("Email: ")
    senha = input("Senha: ")
    perfil = input("Perfil (admin, vendedor, estoque, financeiro, visitante) [vendedor]: ") or "vendedor"

    # Criptografa a senha
    senha_criptografada = bcrypt.hashpw(senha.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

    try:
        cursor.execute("""
            INSERT INTO usuarios (nome, email, senha, perfil, ativo, colunas_visiveis_clientes)
            VALUES (%s, %s, %s, %s, TRUE, %s)
        """, (nome, email, senha_criptografada, perfil))
        conn.commit()
        print(f"\n✅ Usuário '{nome}' criado com sucesso!")
    except mysql.connector.Error as err:
        print("❌ Erro ao criar usuário:", err)

create_user()

cursor.close()
conn.close()
