set -e

REPO_DIR="/app"  
REPO_URL="https://github.com/ваш-пользователь/ваш-репозиторий.git"
BRANCH="main"
VERSION_FILE="/app/version.txt"

if [ ! -d "$REPO_DIR/.git" ]; then
    echo "Клонируем репозиторий..."
    git clone --depth 1 --branch $BRANCH $REPO_URL $REPO_DIR
else
    echo "Обновляем репозиторий..."
    cd $REPO_DIR
    git pull origin $BRANCH
fi

cd $REPO_DIR
git log -1 --format=%cs > $VERSION_FILE
echo "Обновлено: $(cat $VERSION_FILE)"
 