# TagKontrol Discord Bot 🏷️

Discord sunucularınızda üyelerin **identity_guild_id** (klan tag'i) durumunu kontrol eden ve otomatik aksiyonlar alabilen gelişmiş bir bot.

## 📋 İçindekiler

- [Bot Ne İşe Yarar?](#bot-ne-işe-yarar)
- [Özellikler](#özellikler)
- [Gereksinimler](#gereksinimler)
- [Kurulum](#kurulum)
- [Yapılandırma](#yapılandırma)
- [Komutlar](#komutlar)
- [Kullanım Senaryoları](#kullanım-senaryoları)
- [İzinler ve Güvenlik](#izinler-ve-güvenlik)
- [Sorun Giderme](#sorun-giderme)
- [Lisans](#lisans)

---

## Bot Ne İşe Yarar?

**TagKontrol**, Discord'un yeni **identity_guild_id** özelliğini kullanarak sunucunuzdaki üyelerin klan tag'lerine sahip olup olmadığını kontrol eder. Bu bot sayesinde:

- Tag'e sahip olan ve olmayan üyeleri otomatik olarak tespit edebilirsiniz
- Farklı üye gruplarına (tag'i olanlar / olmayanlar) farklı aksiyonlar uygulayabilirsiniz
- Belirli aralıklarla otomatik kontroller yapabilirsiniz
- Üye yönetimini otomatize edebilirsiniz

**Identity Guild ID Nedir?**  
Discord'un klan sistemi özelliği olan `identity_guild_id`, bir kullanıcının hangi sunucu ile "bağlı" olduğunu gösterir. Bu özellik sayesinde, kullanıcılar bir sunucunun tag'ini Discord profillerinde gösterebilirler.

---

## Özellikler

### ✅ Tag Kontrolü (`/tagcheck`)
- Sunucudaki tüm üyelerin identity_guild_id durumunu kontrol eder
- Tag'e sahip olan ve olmayan üyeleri listeler
- İnteraktif seçim menüleri ile farklı aksiyonlar uygulamanıza olanak tanır

### 🎭 Uygulanabilir Aksiyonlar

**Tag'e sahip olanlar için:**
- ✅ Rol verme
- ✏️ İsim düzenleme (başına tag ekleme)
- ⏸️ Hiçbir şey yapma

**Tag'e sahip olmayanlar için:**
- ✅ Rol verme
- 🚫 Sunucudan atma (kick)
- ✏️ İsim düzenleme
- ⏱️ Timeout uygulama (5dk, 10dk, 1 saat, 1 gün, 1 hafta)
- ❌ Rol alma

### 🔄 Otomatik Döngü (`/tagcycle`)
- Belirli aralıklarla otomatik tag kontrolü yapabilirsiniz
- Döngü süreleri: 1 saat, 12 saat, 1 gün, 3 gün, 7 gün
- Aktif döngüyü düzenleyebilir veya durdurabilirsiniz

### 🎯 Tag Rolü (`/tagrole`)
- Özel bir "tag rolü" belirleyebilirsiniz
- Rol verme/alma aksiyonlarında bu rol kullanılır

---

## Gereksinimler

### Yazılım Gereksinimleri
- **Node.js** v16.9.0 veya üzeri
- **npm** (Node.js ile birlikte gelir)

### Discord Gereksinimleri
- Bir Discord Bot oluşturmuş olmalısınız ([Discord Developer Portal](https://discord.com/developers/applications))
- Bot'unuzun aşağıdaki **intents**'lere sahip olması gerekir:
  - `GUILDS`
  - `GUILD_MEMBERS` (Privileged Intent - etkinleştirilmeli)
  
### Bot İzinleri
Bot'unuzun sunucuda aşağıdaki izinlere sahip olması gerekir:
- `Administrator` (önerilen) veya en azından:
  - `Manage Roles` (Rolleri Yönet)
  - `Manage Nicknames` (Takma Adları Yönet)
  - `Kick Members` (Üyeleri At)
  - `Moderate Members` (Üyelere Timeout Uygula)
  - `View Server Insights` (Sunucu İstatistiklerini Görüntüle)

---

## Kurulum

### 1. Depoyu İndirin

```bash
git clone https://github.com/d4s1337/tagkontrol-discordjs.git
cd tagkontrol-discordjs
```

### 2. Bağımlılıkları Yükleyin

```bash
npm install
```

### 3. Environment Dosyasını Oluşturun

`.env` adında bir dosya oluşturun (`.env.example` dosyasını kopyalayabilirsiniz):

```bash
cp .env.example .env
```

### 4. Environment Değişkenlerini Ayarlayın

`.env` dosyasını açın ve gerekli bilgileri girin:

```env
DISCORD_TOKEN=sizin_bot_tokeniniz
CLIENT_ID=sizin_bot_client_id
```

**Token ve Client ID nasıl alınır?**
1. [Discord Developer Portal](https://discord.com/developers/applications)'a gidin
2. Uygulamanızı seçin
3. **Bot** sekmesinden **TOKEN**'ı alın (Reset Token butonuna basıp kopyalayın)
4. **General Information** sekmesinden **APPLICATION ID**'yi (CLIENT_ID) kopyalayın

### 5. Bot'u Çalıştırın

```bash
node index.js
```

Bot başarıyla çalıştığında şu mesajı göreceksiniz:
```
Slash komutları kaydedildi.
Bot hazır: BotAdı#1234
```

---

## Yapılandırma

### Environment Değişkenleri

| Değişken | Açıklama | Zorunlu |
|----------|----------|---------|
| `DISCORD_TOKEN` | Discord bot token'ı | ✅ Evet |
| `CLIENT_ID` | Discord bot application ID | ✅ Evet |

### Bot'u Sunucuya Davet Etme

1. [Discord Developer Portal](https://discord.com/developers/applications)'da uygulamanızı açın
2. **OAuth2** > **URL Generator** bölümüne gidin
3. **SCOPES** bölümünden şunları seçin:
   - `bot`
   - `applications.commands`
4. **BOT PERMISSIONS** bölümünden şunları seçin:
   - `Administrator` (önerilen)
5. Oluşan URL'yi kopyalayın ve tarayıcınızda açın
6. Bot'u sunucunuza davet edin

### Privileged Gateway Intents

Bot'un üyeleri görebilmesi için **Server Members Intent**'i aktifleştirmelisiniz:

1. [Discord Developer Portal](https://discord.com/developers/applications)'da uygulamanızı açın
2. **Bot** sekmesine gidin
3. **Privileged Gateway Intents** bölümünde şunları aktifleştirin:
   - ✅ **SERVER MEMBERS INTENT**
4. Değişiklikleri kaydedin

---

## Komutlar

Tüm komutlar **slash komutları** (`/`) olarak kullanılır ve yalnızca **Yönetici** yetkisine sahip kişiler veya **sunucu sahibi** tarafından kullanılabilir.

### `/tagcheck` - Tag Kontrolü Yap

Sunucudaki tüm üyelerin identity_guild_id durumunu kontrol eder ve aksiyonlar almanızı sağlar.

**Kullanım:**
```
/tagcheck
```

**Ne Yapar:**
1. Tüm sunucu üyelerini tarar (botlar hariç)
2. Her üyenin identity_guild_id'sini kontrol eder
3. Tag'e sahip olan ve olmayan üyeleri sayar
4. İki adet seçim menüsü gösterir:
   - **Tag'ı olanlar için** aksiyon seçimi
   - **Tag'ı olmayanlar için** aksiyon seçimi

**Örnek Senaryo:**
- 25 üyenin tag'i var
- 10 üyenin tag'i yok
- Tag'ı olmayanlara "timeout" uygulayabilir, rol alabilir veya sunucudan atabilirsiniz

---

### `/tagrole` - Tag Rolünü Ayarla

Rol verme/alma aksiyonlarında kullanılacak özel rolü belirler.

**Kullanım:**
```
/tagrole role:@TagRolü
```

**Parametreler:**
- `role`: Ayarlamak istediğiniz rol (rol seçimi veya ID)

**Örnek:**
```
/tagrole role:@Taglı Üyeler
```

**Not:** Bu komutu kullanmadan rol verme/alma aksiyonlarını kullanamazsınız.

---

### `/tagcycle` - Otomatik Döngü Ayarla

Belirli aralıklarla otomatik tag kontrolü yapmanızı sağlar.

**Kullanım:**
```
/tagcycle
```

**İlk Kullanım (Döngü Yoksa):**
1. Modal açılır ve tag'inizi girmeniz istenir (varsayılan: sunucu ID)
2. Tag'i onayla (şu an sadece sunucu ID'si destekleniyor)
3. Kontrol döngüsü aralığını seçin:
   - 1 Saat
   - 12 Saat
   - 1 Gün
   - 3 Gün
   - 7 Gün

**Aktif Döngü Varsa:**
- **Düzenle**: Döngü süresini değiştirebilirsiniz
- **Kapat**: Otomatik döngüyü durdurur

**Ne İşe Yarar:**
Otomatik döngü aktifken, bot belirlediğiniz aralıklarla `/tagcheck` işlemini otomatik olarak yapar. Bu sayede sürekli manuel kontrol yapmanıza gerek kalmaz.

---

## Kullanım Senaryoları

### Senaryo 1: Tag'ı Olmayanlara Rol Al

```
1. /tagcheck komutunu çalıştırın
2. "Tagı olmayanlara uygulanacak aksiyon" menüsünden "Rol Al" seçin
3. Belirlediğiniz tag rolü, tag'ı olmayan tüm üyelerden alınır
```

### Senaryo 2: Tag'ı Olmayanlara Timeout

```
1. /tagcheck komutunu çalıştırın
2. "Tagı olmayanlara uygulanacak aksiyon" menüsünden "Timeout Uygula" seçin
3. Timeout süresini seçin (örn: 1 gün)
4. Tag'ı olmayan tüm üyelere timeout uygulanır
```

### Senaryo 3: İsim Başına Tag Ekleme

```
1. /tagcheck komutunu çalıştırın
2. İstediğiniz grup için "İsim Düzenle" seçin
3. Modal'da başına eklenecek ifadeyi girin (örn: "[TAG]")
4. Seçilen grubun tüm üyelerinin isimlerinin başına tag eklenir
```

### Senaryo 4: Otomatik Günlük Kontrol

```
1. /tagrole role:@Taglı Üyeler ile tag rolünü ayarlayın
2. /tagcycle komutunu çalıştırın
3. Tag'inizi onaylayın (sunucu ID'si)
4. "1 Gün" aralığını seçin
5. Her gün otomatik olarak tag kontrolü yapılır
```

### Senaryo 5: Sadece Tag'ı Olanlara Rol Ver

```
1. /tagrole role:@TagRolü ile rolü ayarlayın
2. /tagcheck komutunu çalıştırın
3. "Tagı olanlara uygulanacak aksiyon" menüsünden "Rol Ver" seçin
4. Tag'ı olan tüm üyelere belirlediğiniz rol verilir
```

---

## İzinler ve Güvenlik

### Komut İzinleri

Tüm komutlar yalnızca aşağıdaki kullanıcılar tarafından çalıştırılabilir:
- ✅ **Sunucu Sahibi**
- ✅ **Administrator** yetkisine sahip üyeler

Diğer üyeler komutları çalıştırmaya çalıştığında hata mesajı alırlar.

### Bot İzinleri

Bot'un aksiyonları gerçekleştirebilmesi için gerekli izinler:

| Aksiyon | Gerekli İzin |
|---------|--------------|
| Rol verme/alma | `Manage Roles` |
| İsim düzenleme | `Manage Nicknames` |
| Timeout uygulama | `Moderate Members` |
| Sunucudan atma | `Kick Members` |
| Üyeleri görüntüleme | `GUILD_MEMBERS` Intent |

**Önemli Not:** Bot'un rolü, değiştireceği rollerin üzerinde olmalıdır (Discord rol hiyerarşisi).

### Veri Saklama

Bot, aşağıdaki bilgileri yerel olarak (`dasi.json` dosyasında) saklar:
- Her sunucu için ayarlanan tag rolü ID'si
- Aktif tag döngüsü ayarları (tag, süre)

**Saklanan veriler:**
- ✅ Rol ID'leri
- ✅ Sunucu ID'leri
- ✅ Döngü ayarları

**Saklanmayan veriler:**
- ❌ Kullanıcı verileri
- ❌ Mesaj içerikleri
- ❌ Hassas bilgiler

---

## Sorun Giderme

### Bot Çalışmıyor / Başlamıyor

**Kontrol Edin:**
1. `.env` dosyasında `DISCORD_TOKEN` ve `CLIENT_ID` doğru girilmiş mi?
2. Node.js versiyonu v16.9.0 veya üzeri mi? (`node --version`)
3. Bağımlılıklar yüklenmiş mi? (`npm install`)

**Hata Mesajları:**
- `DISCORD_TOKEN ve CLIENT_ID environment değişkenlerini ayarlayın.`
  - Çözüm: `.env` dosyasını oluşturun ve gerekli değişkenleri ekleyin

### Komutlar Görünmüyor

**Çözümler:**
1. Bot'u sunucuya `applications.commands` scope'u ile davet ettiğinizden emin olun
2. Bot'u yeniden başlatın (komutlar otomatik kaydedilir)
3. Discord uygulamasını yeniden başlatın

### "Yönetici olmalısın" Hatası

Bu beklenen bir davranıştır. Komutları yalnızca:
- Sunucu sahibi
- Administrator yetkisine sahip üyeler kullanabilir

### Bot Üyeleri Göremiyor

**Çözüm:**
1. Discord Developer Portal'da **SERVER MEMBERS INTENT**'i aktifleştirin
2. Bot'u yeniden başlatın

### Rol Verme/Alma Çalışmıyor

**Kontrol Edin:**
1. `/tagrole` komutu ile rol ayarlanmış mı?
2. Bot'un rolü, verilecek rolün üzerinde mi? (rol hiyerarşisi)
3. Bot'un `Manage Roles` yetkisi var mı?

### Timeout/Kick Çalışmıyor

**Kontrol Edin:**
1. Bot'un `Moderate Members` (timeout için) veya `Kick Members` (kick için) yetkisi var mı?
2. Bot'un rolü, işlem yapılacak üyelerin rolünün üzerinde mi?

### Identity Guild ID Nasıl Ayarlanır?

Bu, Discord kullanıcılarının Discord ayarlarından yapması gereken bir işlemdir:
1. Discord Profil Ayarları > **Klan Kimliği** (Clan Identity)
2. Sunucunuzu seçin
3. Tag'iniz profilinizde görünmeye başlar

Bot, bu ayarı yapan kullanıcıların `identity_guild_id` değerini kontrol eder.

---

## Teknik Detaylar

### Kullanılan Kütüphaneler

- **discord.js** v14.25.1 - Discord API wrapper
- **dotenv** v17.2.3 - Environment değişkenleri yönetimi
- **node-fetch** v3.3.2 - HTTP istekleri

### Dosya Yapısı

```
tagkontrol-discordjs/
├── index.js           # Ana bot dosyası
├── dasi.json          # Veri tabanı (otomatik oluşturulur)
├── package.json       # Proje bağımlılıkları
├── .env              # Environment değişkenleri (siz oluşturacaksınız)
├── .env.example      # Environment şablonu
└── README.md         # İngilizce dokümantasyon
└── README-TR.md      # Türkçe dokümantasyon (bu dosya)
```

### API Kullanımı

Bot, Discord'un REST API'sini kullanarak kullanıcıların `identity_guild_id` bilgisini alır:
```javascript
GET https://discord.com/api/v10/users/{userId}
```

Bu endpoint, kullanıcının clan bilgilerini döndürür ve bot bundan `identity_guild_id` değerini çıkarır.

---

## Sık Sorulan Sorular (SSS)

### Q: Bot birden fazla sunucuda çalışır mı?
**A:** Evet! Bot, her sunucu için ayrı ayarları `dasi.json` dosyasında saklar.

### Q: Tag döngüsü tam olarak ne yapar?
**A:** Aktif olduğunda, belirlediğiniz aralıklarla otomatik olarak tag kontrolü yapar. Ancak, aksiyonları manuel olarak siz seçersiniz. Tam otomatik işlem yapmaz.

### Q: Birden fazla tag rolü ayarlayabilir miyim?
**A:** Hayır, her sunucu için yalnızca bir tag rolü ayarlanabilir.

### Q: Bot, üye join/leave eventlerini takip eder mi?
**A:** Şu an için hayır. Bot yalnızca manuel `/tagcheck` komutu veya otomatik döngülerle çalışır.

### Q: Timeout süresi ne kadar olabilir?
**A:** 5 dakika, 10 dakika, 1 saat, 1 gün veya 1 hafta seçeneklerinden birini seçebilirsiniz.

### Q: Bot mesajları siler mi?
**A:** Hayır, bot hiçbir mesaj silme işlemi yapmaz.

---

## Güncelleme Notları

### v1.0.0 (Mevcut Sürüm)
- ✅ Identity guild ID kontrolü
- ✅ Tag rolü sistemi
- ✅ Otomatik döngü sistemi
- ✅ İnteraktif komut menüleri
- ✅ Çoklu aksiyon desteği (rol, kick, timeout, rename)

---

## Lisans

Bu proje **AGPL-3.0-only** lisansı altında lisanslanmıştır.

---

## Destek ve İletişim

- **GitHub Issues:** [Sorun Bildirin](https://github.com/d4s1337/tagkontrol-discordjs/issues)
- **Geliştirici:** d4s1337

---

## Katkıda Bulunma

Pull request'ler kabul edilir! Büyük değişiklikler için lütfen önce bir issue açarak neyi değiştirmek istediğinizi tartışın.

---

**Not:** Bu bot, Discord'un güncel API özelliklerini kullanır. Discord'un `identity_guild_id` özelliğini desteklediğinden emin olun.

---

*Son Güncelleme: Ocak 2026*
