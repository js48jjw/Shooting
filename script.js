// 캔버스 및 컨텍스트 설정
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// 게임 변수
let score = 0;
let level = 1;
let gameRunning = true;
let stars = [];
let lasers = [];
let powerUps = [];
let explosions = [];
let gameStartTime = null;
let spawnTimeout;

// TOP3 기록 저장을 위한 배열
let topScores = JSON.parse(localStorage.getItem('shootingStarTopScores')) || [];

// 마지막 초기화 시간 (날짜)
let lastResetDate = localStorage.getItem('lastResetDate') || new Date().toDateString();

// 우주선 이미지 로드
const spaceshipImg = new Image();
spaceshipImg.src = 'public/SHIP.png';

// 이미지 로딩 완료 확인
let imagesLoaded = 0;
const totalImages = 1; // 이제 이미지는 하나만 로드합니다.

function startGame() {
    gameStartTime = Date.now();
    gameLoop();
    spawnEnemies();
}

function checkImagesLoaded() {
    imagesLoaded++;
    if (imagesLoaded === totalImages) {
        // 모든 이미지가 로드되었을 때 게임 시작
        startGame();
    }
}

spaceshipImg.onload = checkImagesLoaded;

// 매일 아침 6시에 TOP3 기록 초기화
function checkAndResetScores() {
    const now = new Date();
    const today = now.toDateString();
    
    // 날짜가 변경되었고, 현재 시간이 6시 이후인 경우 초기화
    if (lastResetDate !== today && now.getHours() >= 6) {
        topScores = [];
        localStorage.setItem('shootingStarTopScores', JSON.stringify(topScores));
        localStorage.setItem('lastResetDate', today);
        lastResetDate = today;
    }
}

// 페이지 로드 시 초기화 체크
checkAndResetScores();

// 우주선 객체
const spaceship = {
    x: canvas.width / 2 - 37.5,
    y: canvas.height - 80,
    width: 75,
    height: 60,
    speed: 7,
    draw: function() {
        // 우주선 이미지 그리기
        if (spaceshipImg.complete && spaceshipImg.naturalWidth !== 0) {
            ctx.drawImage(spaceshipImg, this.x, this.y, this.width, this.height);
        } else {
            // 이미지가 로드되지 않은 경우 기본 도형 그리기
            ctx.fillStyle = '#00aaff';
            ctx.fillRect(this.x, this.y, this.width, this.height);
            
            // 우주선 날개
            ctx.beginPath();
            ctx.moveTo(this.x, this.y + this.height);
            ctx.lineTo(this.x - 15, this.y + this.height + 15);
            ctx.lineTo(this.x + this.width + 15, this.y + this.height + 15);
            ctx.lineTo(this.x + this.width, this.y + this.height);
            ctx.closePath();
            ctx.fillStyle = '#0088cc';
            ctx.fill();
            
            // 우주선 코ckpit
            ctx.beginPath();
            ctx.moveTo(this.x + this.width/2, this.y - 10);
            ctx.lineTo(this.x + 10, this.y + this.height/3);
            ctx.lineTo(this.x + this.width - 10, this.y + this.height/3);
            ctx.closePath();
            ctx.fillStyle = '#00ddff';
            ctx.fill();
        }
    }
};

// 키보드 상태 추적
const keys = {};

// 이벤트 리스너
document.addEventListener('keydown', (e) => {
    keys[e.key] = true;
    
    // 스페이스바로 레이저 발사
    if (e.key === ' ' && gameRunning) {
        lasers.push({
            x: spaceship.x + spaceship.width / 2 - 6, // 중앙에서 약간 왼쪽으로
            y: spaceship.y,
            width: 12, // 너비를 12로 증가 (기존 4)
            height: 20, // 높이를 20으로 증가 (기존 15)
            speed: 10,
            color: '#ff5555'
        });
    }
});

document.addEventListener('keyup', (e) => {
    keys[e.key] = false;
});

// 우주선 이동
function moveSpaceship() {
    if (keys['ArrowLeft'] && spaceship.x > 0) {
        spaceship.x -= spaceship.speed;
    }
    if (keys['ArrowRight'] && spaceship.x < canvas.width - spaceship.width) {
        spaceship.x += spaceship.speed;
    }
}

// 레이저 업데이트
function updateLasers() {
    for (let i = lasers.length - 1; i >= 0; i--) {
        lasers[i].y -= lasers[i].speed;
        
        // 화면 밖으로 나간 레이저 제거
        if (lasers[i].y < 0) {
            lasers.splice(i, 1);
            continue;
        }
        
        // 별과의 충돌 확인
        for (let j = stars.length - 1; j >= 0; j--) {
            if (
                lasers[i].x < stars[j].x + stars[j].width &&
                lasers[i].x + lasers[i].width > stars[j].x &&
                lasers[i].y < stars[j].y + stars[j].height &&
                lasers[i].y + lasers[i].height > stars[j].y
            ) {
                // 충돌 발생 - 폭발 효과 추가
                explosions.push({
                    x: stars[j].x + stars[j].width/2,
                    y: stars[j].y + stars[j].height/2,
                    radius: 5,
                    maxRadius: 30,
                    speed: 1.5,
                    alpha: 1
                });
                
                // 레이저와 별 제거
                lasers.splice(i, 1);
                stars.splice(j, 1);
                
                // 점수 증가
                score += 10;
                document.getElementById('score').textContent = score;
                break;
            }
        }
    }
}

// 별 생성
function createStar() {
    const size = Math.random() * 20 + 10;
    stars.push({
        x: Math.random() * (canvas.width - size),
        y: -size,
        width: size,
        height: size,
        speed: 2 + Math.random() * (level/2)
    });
}

// 파워업 생성
function createPowerUp() {
    if (Math.random() < 0.005) { // 0.5% 확률로 생성
        powerUps.push({
            x: Math.random() * (canvas.width - 30),
            y: -30,
            width: 30,
            height: 30,
            speed: 2,
            type: Math.random() < 0.5 ? 'multishot' : 'rapidfire'
        });
    }
}

// 파워업 업데이트
function updatePowerUps() {
    for (let i = powerUps.length - 1; i >= 0; i--) {
        powerUps[i].y += powerUps[i].speed;
        
        // 화면 밖으로 나간 파워업 제거
        if (powerUps[i].y > canvas.height) {
            powerUps.splice(i, 1);
            continue;
        }
        
        // 우주선과의 충돌 확인
        if (
            spaceship.x < powerUps[i].x + powerUps[i].width &&
            spaceship.x + spaceship.width > powerUps[i].x &&
            spaceship.y < powerUps[i].y + powerUps[i].height &&
            spaceship.y + spaceship.height > powerUps[i].y
        ) {
            // 파워업 적용
            if (powerUps[i].type === 'multishot') {
                // 멀티샷: 3발 발사
                lasers.push({
                    x: spaceship.x + spaceship.width / 2 - 20,
                    y: spaceship.y,
                    width: 12,
                    height: 20,
                    speed: 10,
                    color: '#55ff55'
                });
                lasers.push({
                    x: spaceship.x + spaceship.width / 2 - 6,
                    y: spaceship.y,
                    width: 12,
                    height: 20,
                    speed: 10,
                    color: '#55ff55'
                });
                lasers.push({
                    x: spaceship.x + spaceship.width / 2 + 8,
                    y: spaceship.y,
                    width: 12,
                    height: 20,
                    speed: 10,
                    color: '#55ff55'
                });
            } else if (powerUps[i].type === 'rapidfire') {
                // 빠른 발사: 0.1초마다 자동 발사 (5초간)
                let rapidFireCount = 0;
                const rapidFireInterval = setInterval(() => {
                    if (rapidFireCount < 50) { // 5초간 (0.1초 * 50)
                        lasers.push({
                            x: spaceship.x + spaceship.width / 2 - 6,
                            y: spaceship.y,
                            width: 12,
                            height: 20,
                            speed: 10,
                            color: '#ff55ff'
                        });
                        rapidFireCount++;
                    } else {
                        clearInterval(rapidFireInterval);
                    }
                }, 100);
            }
            
            // 파워업 제거
            powerUps.splice(i, 1);
        }
    }
}

// 별 업데이트
function updateStars() {
    for (let i = stars.length - 1; i >= 0; i--) {
        stars[i].y += stars[i].speed;
        
        // 화면 밖으로 나간 별 제거
        if (stars[i].y > canvas.height) {
            stars.splice(i, 1);
            continue;
        }
        
        // 우주선과의 충돌 확인
        if (
            spaceship.x < stars[i].x + stars[i].width &&
            spaceship.x + spaceship.width > stars[i].x &&
            spaceship.y < stars[i].y + stars[i].height &&
            spaceship.y + spaceship.height > stars[i].y
        ) {
            // 게임 오버
            gameOver();
        }
    }
}

// 폭발 효과 업데이트
function updateExplosions() {
    for (let i = explosions.length - 1; i >= 0; i--) {
        explosions[i].radius += explosions[i].speed;
        explosions[i].alpha -= 0.02;
        
        if (explosions[i].alpha <= 0) {
            explosions.splice(i, 1);
        }
    }
}

// 레벨 업데이트
function updateLevel() {
    level = Math.floor(score / 100) + 1;
    document.getElementById('level').textContent = level;
}

// 배경에 별 효과 추가
function createBackgroundStars() {
    const container = document.querySelector('body');
    for (let i = 0; i < 100; i++) {
        const star = document.createElement('div');
        star.className = 'star';
        star.style.width = `${Math.random() * 3}px`;
        star.style.height = star.style.width;
        star.style.left = `${Math.random() * 100}%`;
        star.style.top = `${Math.random() * 100}%`;
        star.style.animationDuration = `${Math.random() * 3 + 1}s`;
        star.style.animationDelay = `${Math.random() * 5}s`;
        container.appendChild(star);
    }
}

// 게임 종료 처리
function gameOver() {
    gameRunning = false;
    clearTimeout(spawnTimeout);
    
    // 점수 저장
    topScores.push(score);
    topScores.sort((a, b) => b - a);
    topScores = topScores.slice(0, 3); // TOP3만 유지
    localStorage.setItem('shootingStarTopScores', JSON.stringify(topScores));
    
    // 게임 오버 팝업 표시
    showGameOverPopup();
}

// 게임 오버 팝업 표시
function showGameOverPopup() {
    // 기존 팝업 제거
    const existingPopup = document.getElementById('gameOverPopup');
    if (existingPopup) {
        existingPopup.remove();
    }
    
    // 팝업 요소 생성
    const popup = document.createElement('div');
    popup.id = 'gameOverPopup';
    popup.style.position = 'absolute';
    popup.style.top = '50%';
    popup.style.left = '50%';
    popup.style.transform = 'translate(-50%, -50%)';
    popup.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
    popup.style.padding = '30px';
    popup.style.borderRadius = '15px';
    popup.style.textAlign = 'center';
    popup.style.boxShadow = '0 0 30px rgba(255, 0, 255, 0.7)';
    popup.style.zIndex = '1000';
    popup.style.border = '2px solid #ff00ff';
    
    // 제목
    const title = document.createElement('h2');
    title.textContent = '게임 종료';
    title.style.color = '#ff00ff';
    title.style.fontSize = '36px';
    title.style.margin = '0 0 20px 0';
    title.style.textShadow = '0 0 10px #ff00ff';
    popup.appendChild(title);
    
    // 점수
    const scoreText = document.createElement('p');
    scoreText.textContent = `최종 점수: ${score}`;
    scoreText.style.color = '#ffffff';
    scoreText.style.fontSize = '24px';
    scoreText.style.margin = '0 0 30px 0';
    popup.appendChild(scoreText);
    
    // TOP3 기록
    const topScoresTitle = document.createElement('h3');
    topScoresTitle.textContent = 'TOP 3 기록';
    topScoresTitle.style.color = '#00ffff';
    topScoresTitle.style.fontSize = '28px';
    topScoresTitle.style.margin = '0 0 15px 0';
    popup.appendChild(topScoresTitle);
    
    const scoresList = document.createElement('ul');
    scoresList.style.listStyle = 'none';
    scoresList.style.padding = '0';
    scoresList.style.margin = '0 0 30px 0';
    
    for (let i = 0; i < 3; i++) {
        const scoreItem = document.createElement('li');
        scoreItem.textContent = topScores[i] ? `${i+1}위: ${topScores[i]}점` : `${i+1}위: -`;
        scoreItem.style.color = i === 0 ? '#ffff00' : i === 1 ? '#c0c0c0' : '#cd7f32';
        scoreItem.style.fontSize = '20px';
        scoreItem.style.margin = '10px 0';
        scoresList.appendChild(scoreItem);
    }
    
    popup.appendChild(scoresList);
    
    // 재시작 버튼
    const restartButton = document.createElement('button');
    restartButton.textContent = '다시 시작';
    restartButton.style.backgroundColor = '#4a148c';
    restartButton.style.color = 'white';
    restartButton.style.border = 'none';
    restartButton.style.padding = '12px 30px';
    restartButton.style.fontSize = '20px';
    restartButton.style.borderRadius = '30px';
    restartButton.style.cursor = 'pointer';
    restartButton.style.transition = 'all 0.3s';
    restartButton.style.boxShadow = '0 0 15px rgba(100, 100, 255, 0.7)';
    
    restartButton.onmouseover = function() {
        this.style.backgroundColor = '#7b1fa2';
        this.style.transform = 'scale(1.05)';
    };
    
    restartButton.onmouseout = function() {
        this.style.backgroundColor = '#4a148c';
        this.style.transform = 'scale(1)';
    };
    
    restartButton.onclick = function() {
        // 게임 재시작
        restartGame();
    };
    
    popup.appendChild(restartButton);
    
    // 팝업을 게임 컨테이너에 추가
    document.querySelector('.game-container').appendChild(popup);
}

// 게임 재시작 함수
function restartGame() {
    // 기존 팝업 제거
    const existingPopup = document.getElementById('gameOverPopup');
    if (existingPopup) {
        existingPopup.remove();
    }
    
    // 게임 상태 초기화
    score = 0;
    level = 1;
    gameRunning = true;
    stars = [];
    lasers = [];
    powerUps = [];
    explosions = [];
    gameStartTime = Date.now();
    
    // UI 업데이트
    document.getElementById('score').textContent = score;
    document.getElementById('level').textContent = level;
    
    // 우주선 위치 초기화
    spaceship.x = canvas.width / 2 - 37.5;
    spaceship.y = canvas.height - 80;
    
    // 게임 루프 재시작
    if (imagesLoaded === totalImages) {
        requestAnimationFrame(gameLoop);
        spawnEnemies();
    }
}

// 게임 렌더링
function render() {
    // 캔버스 지우기
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 우주선 그리기
    spaceship.draw();
    
    // 레이저 그리기
    for (const laser of lasers) {
        ctx.fillStyle = laser.color;
        ctx.fillRect(laser.x, laser.y, laser.width, laser.height);
        
        // 레이저 꼬리 효과
        ctx.beginPath();
        ctx.moveTo(laser.x + laser.width/2, laser.y + laser.height);
        ctx.lineTo(laser.x + laser.width/2 - 5, laser.y + laser.height + 15);
        ctx.lineTo(laser.x + laser.width/2 + 5, laser.y + laser.height + 15);
        ctx.closePath();
        ctx.fillStyle = '#ff9999';
        ctx.fill();
    }
    
    // 별 그리기
    for (const star of stars) {
        // 이미지가 로드되지 않은 경우 기본 도형 그리기
        ctx.fillStyle = `hsl(${Math.random() * 60}, 100%, 70%)`;
        ctx.beginPath();
        ctx.arc(star.x + star.width/2, star.y + star.height/2, star.width/2, 0, Math.PI * 2);
        ctx.fill();
        
        // 별 광선 효과
        ctx.beginPath();
        ctx.moveTo(star.x + star.width/2, star.y);
        ctx.lineTo(star.x + star.width/2, star.y - 10);
        ctx.moveTo(star.x, star.y + star.height/2);
        ctx.lineTo(star.x - 10, star.y + star.height/2);
        ctx.moveTo(star.x + star.width, star.y + star.height/2);
        ctx.lineTo(star.x + star.width + 10, star.y + star.height/2);
        ctx.moveTo(star.x + star.width/2, star.y + star.height);
        ctx.lineTo(star.x + star.width/2, star.y + star.height + 10);
        ctx.strokeStyle = `hsl(${Math.random() * 60}, 100%, 70%)`;
        ctx.lineWidth = 2;
        ctx.stroke();
    }
    
    // 파워업 그리기
    for (const powerUp of powerUps) {
        ctx.fillStyle = powerUp.type === 'multishot' ? '#55ff55' : '#ff55ff';
        ctx.beginPath();
        ctx.arc(powerUp.x + powerUp.width/2, powerUp.y + powerUp.height/2, powerUp.width/2, 0, Math.PI * 2);
        ctx.fill();
        
        // 파워업 심볼
        ctx.fillStyle = '#ffffff';
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(powerUp.type === 'multishot' ? 'M' : 'R', powerUp.x + powerUp.width/2, powerUp.y + powerUp.height/2);
    }
    
    // 폭발 효과 그리기
    for (const explosion of explosions) {
        ctx.beginPath();
        ctx.arc(explosion.x, explosion.y, explosion.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 100, 0, ${explosion.alpha})`;
        ctx.fill();
        
        // 내부 원
        ctx.beginPath();
        ctx.arc(explosion.x, explosion.y, explosion.radius * 0.6, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 0, ${explosion.alpha})`;
        ctx.fill();
    }
}

// 게임 루프
function gameLoop() {
    if (gameRunning) {
        moveSpaceship();
        updateLasers();
        updateStars();
        updatePowerUps();
        updateExplosions();
        updateLevel();
        render();
    }
    
    requestAnimationFrame(gameLoop);
}

// 시간 기반 몹 생성
function spawnEnemies() {
    if (gameRunning) {
        createStar();
        createPowerUp();

        const elapsedTime = (Date.now() - gameStartTime) / 1000; // 초 단위
        // 시간이 지날수록 생성 간격이 점차 감소합니다.
        // 1초마다 8ms씩 감소하며, 최소 간격은 200ms입니다.
        const spawnInterval = Math.max(200, 1200 - (elapsedTime * 8));

        spawnTimeout = setTimeout(spawnEnemies, spawnInterval);
    }
}

// 배경 별 생성
createBackgroundStars();

// 이미지가 이미 로드된 경우를 대비해 게임 시작
if (spaceshipImg.complete && spaceshipImg.naturalWidth !== 0) {
    imagesLoaded = totalImages;
    startGame();
}