# 100 Bilgisayar = 100 Gelecek

## Yönetim Paneli ve Tek Sayfalık Ön Yüz Aktarım Dokümanı

Bu doküman, mevcut Google Sheets + Google Apps Script tabanlı bağış duvarı uygulamasının tersine mühendislik çıktısını ve yeni hedef mimariyi özetler. Yeni hedef, verilerin bir yönetim panelinden kontrol edildiği ve ziyaretçilerin tek sayfalık bir ön yüz üzerinden bağış duvarını gördüğü bağımsız bir web uygulamasıdır.

## 1. Mevcut sistemden çıkarılan yapı

Mevcut uygulama üç ana katmandan oluşuyor:

1. Google Sheets veri kaynağı
2. Google Apps Script sunucu katmanı
3. HTML / CSS / vanilla JavaScript istemci katmanı

Apps Script tarafında `Code.gs` şu işleri yapıyor:

- Ayarları, metinleri, bağışçıları ve yerleşimleri Google Sheets sekmelerinden okuyor.
- Aktif bağışçıları filtreliyor.
- Manuel yerleşim varsa onu uyguluyor.
- Manuel yerleşim yoksa bağış adedine göre otomatik grid yerleşimi hesaplıyor.
- Logo URL veya Google Drive dosya kimliğini görüntülenebilir URL ya da base64 data URL haline getiriyor.
- Bağışçı web adreslerini normalize ediyor.
- Ön yüze `getWallDataForClient()` ile hazır veri döndürüyor.

İstemci tarafında sayfa şu bölümlerden oluşuyor:

- Üst başlık: `100 Bilgisayar = 100 Gelecek`
- Alt açıklama metni
- Grid tabanlı bağış duvarı
- Paylaşım alanı
- Katkı veren kurumlar listesi
- İletişim ve erişim metni

Ekran görüntüsünde görülen mevcut durum:

- Grid yapısı yaklaşık `13 x 8` hücre mantığında çalışıyor.
- Her bilgisayar bir hücre değerinde temsil ediliyor.
- Bağışçı logoları, bağış miktarı kadar hücre kaplayan bloklara yerleştiriliyor.
- Alt listede bağışçılar ve bilgisayar adetleri gösteriliyor.
- Toplam destek değeri hesaplanıp gösteriliyor.
- WhatsApp, X, LinkedIn ve Facebook paylaşım bağlantıları var.
- Görsel indirme ve hazır metin kopyalama özellikleri var.

## 2. Yeni hedef mimari

Yeni uygulama iki ana arayüzden oluşacak:

1. Yönetim paneli
2. Tek sayfalık ziyaretçi ön yüzü

Önerilen URL yapısı:

- `/` ziyaretçi ön yüzü
- `/admin` yönetim paneli giriş veya panel ana ekranı
- `/admin/donors` bağışçı yönetimi
- `/admin/settings` kampanya ayarları
- `/admin/layout` grid yerleşim yönetimi

Bu yapı, eski Google Sheets yönetimini uygulama içindeki panele taşır. Ziyaretçi tarafı ise tek sayfa olarak kalır ve yönetim panelinden girilen güncel veriyi kullanır.

## 3. Veri modeli

### 3.1 Kampanya ayarları

Kampanya ayarları eski `AYARLAR` sekmesinin karşılığıdır.

Alanlar:

- `campaignTitle`: Kampanya başlığı
- `campaignSubtitle`: Başlık altı açıklama
- `gridCols`: Grid sütun sayısı
- `gridRows`: Grid satır sayısı
- `reachTarget`: Erişim hedefi
- `brandColor`: Ana renk
- `borderColor`: Dış çizgi rengi
- `gridColor`: Hücre çizgi rengi
- `fontFamily`: Yazı tipi
- `reachText`: İletişim ve erişim metni
- `shareText`: Genel paylaşım metni
- `instagramText`: Instagram için özel paylaşım metni
- `posterTitle`: Afiş başlığı
- `posterFileUrl`: Yönetim panelinden yüklenen afiş dosyasının yayın URL'i
- `posterFileName`: Afiş dosya adı
- `posterMimeType`: Afiş dosya türü
- `posterUpdatedAt`: Afiş son güncelleme tarihi

Varsayılan değerler:

- `campaignTitle`: `100 Bilgisayar = 100 Gelecek`
- `campaignSubtitle`: `Bağışlanan her bilgisayar, bu duvarda bir hücreye dönüşür.`
- `gridCols`: `13`
- `gridRows`: `8`
- `reachTarget`: `40000`
- `brandColor`: `#002F50`
- `borderColor`: `#334155`
- `gridColor`: `#CBD5E1`

Afiş kuralları:

- Afiş yönetim panelinden yüklenir.
- Desteklenen ilk dosya türleri `PDF`, `PNG`, `JPG` ve `JPEG` olmalıdır.
- Ön yüzde afiş bölümü yalnızca afiş yüklüyse görünür.
- Görsel afişler sayfada önizleme olarak gösterilir.
- PDF afişler dosya kartı olarak gösterilir.
- Ziyaretçi afişi tek tıkla indirebilmelidir.

### 3.2 Bağışçı

Bağışçı modeli eski `BAGISCILAR` sekmesinin karşılığıdır.

Alanlar:

- `id`: Benzersiz bağışçı kimliği
- `order`: Sıralama değeri
- `isActive`: Yayında olup olmadığı
- `name`: Bağışçı adı
- `computerCount`: Bağışlanan bilgisayar adedi
- `logoUrl`: Logo bağlantısı
- `logoFile`: Yönetim panelinden yüklenen logo dosyası
- `websiteUrl`: Bağışçı web sayfası
- `colorClass`: İleride özel görünüm için sınıf
- `note`: İç not
- `createdAt`: Oluşturma tarihi
- `updatedAt`: Güncelleme tarihi

Kurallar:

- `name` zorunludur.
- `computerCount` pozitif tam sayı olmalıdır.
- `isActive = false` olan bağışçılar ön yüzde gösterilmez.
- `websiteUrl` protokolsüz girilirse otomatik `https://` ile normalize edilir.
- Logo yoksa bağışçı adı metin olarak gösterilir.

### 3.3 Yerleşim

Yerleşim modeli eski `YERLESIM` sekmesinin karşılığıdır.

Alanlar:

- `donorId`: Bağışçı kimliği
- `row`: Başlangıç satırı
- `col`: Başlangıç sütunu
- `width`: Kaplanan sütun sayısı
- `height`: Kaplanan satır sayısı
- `manualOverride`: Manuel yerleşim aktif mi

Kurallar:

- Manuel yerleşim aktifse `row`, `col`, `width`, `height` değerleri doğrudan kullanılır.
- Manuel yerleşim yoksa sistem bağış adedine göre otomatik dikdörtgen boyutu seçer.
- Her bağışçı bloğu `width * height = computerCount` olacak şekilde yerleşmelidir.
- Çakışan ya da grid dışına taşan yerleşimler kaydedilmemelidir.

## 4. Yönetim paneli kapsamı

Yönetim paneli eski Google Sheets işlevlerinin tamamını uygulama içine taşır.

### 4.1 Panel ana ekranı

Gösterilecek özetler:

- Toplam bağışlanan bilgisayar sayısı
- Aktif bağışçı sayısı
- Grid kapasitesi
- Boş hücre sayısı
- Yerleşim hatası olup olmadığı
- Son güncelleme tarihi

### 4.2 Bağışçı yönetimi

İşlevler:

- Bağışçı ekleme
- Bağışçı düzenleme
- Bağışçı pasife alma
- Bağışçı silme veya arşivleme
- Logo yükleme veya logo URL girme
- Web sitesi bağlantısı girme
- Bilgisayar adedi güncelleme
- Sıralama değiştirme

Liste kolonları:

- Bağışçı adı
- Bilgisayar adedi
- Logo durumu
- Web sitesi durumu
- Aktiflik
- Yerleşim durumu
- İşlemler

### 4.3 Kampanya ayarları

İşlevler:

- Başlık ve alt başlık düzenleme
- Grid satır/sütun ayarları
- Renk ayarları
- Erişim metni düzenleme
- Paylaşım metinleri düzenleme
- Kampanya afişi yükleme, değiştirme ve kaldırma

Uyarı:

Grid satır veya sütun sayısı küçültülürse mevcut yerleşimler grid dışına taşabilir. Bu durumda panel kullanıcıyı uyarmalı ve değişiklik kaydedilmeden önce yerleşim kontrolü yapmalıdır.

### 4.4 Yerleşim yönetimi

İşlevler:

- Otomatik yerleşimi yeniden hesaplama
- Bağışçıyı manuel konuma sabitleme
- Manuel sabitlemeyi kaldırma
- Grid üzerinde dolu/boş hücreleri görme
- Çakışmaları panelde hata olarak gösterme

İlk sürümde sürükle-bırak zorunlu değildir. Form tabanlı manuel yerleşim yeterlidir. İkinci sürümde drag-and-drop grid editörü eklenebilir.

## 5. Tek sayfalık ön yüz kapsamı

Ön yüz ziyaretçi için tek sayfa olarak çalışır.

Sayfa bölümleri:

- Kampanya başlığı
- Kampanya açıklaması
- Kampanya afişi görüntüleme ve indirme alanı
- Bağış duvarı grid alanı
- Paylaşım modülü
- Katkı veren kurumlar listesi
- İletişim ve erişim bölümü

Ön yüz davranışları:

- Aktif bağışçılar listelenir.
- Her bağışçı, bağışladığı bilgisayar adedi kadar hücre kaplar.
- Logo varsa logo gösterilir.
- Logo yoksa bağışçı adı gösterilir.
- Web sitesi olan bağışçı bloğu tıklanabilir olur.
- Katkı veren kurumlar listesi bağış adedine göre büyükten küçüğe sıralanır.
- Toplam destek otomatik hesaplanır.
- Paylaşım metni kopyalanabilir.
- Instagram metni ayrıca kopyalanabilir.
- WhatsApp, X, LinkedIn ve Facebook paylaşım bağlantıları üretilir.
- Duvar görseli PNG olarak indirilebilir.
- Yönetim panelinden yüklenen afiş ön yüzde görünür ve indirilebilir.
- Afiş yoksa afiş alanı hiç gösterilmez.

## 6. Yerleşim algoritması

Yerleşim mantığı mevcut Apps Script kodundan korunmalıdır.

Algoritma:

1. Aktif bağışçılar alınır.
2. Manuel yerleşimi olan bağışçılar önce grid üzerine yerleştirilir.
3. Manuel yerleşimlerde grid dışına taşma ve çakışma kontrol edilir.
4. Kalan bağışçılar bilgisayar adedine göre büyükten küçüğe sıralanır.
5. Her bağışçı için bilgisayar adedini tam karşılayan en dengeli dikdörtgen boyut seçilir.
6. Grid üzerinde soldan sağa ve yukarıdan aşağıya ilk uygun boş alan aranır.
7. Uygun alan bulunursa bağışçı yerleştirilir.
8. Uygun alan bulunamazsa yönetim panelinde yerleşim hatası gösterilir.

Boyut seçimi:

- `computerCount = width * height` olmalıdır.
- Mümkünse kareye en yakın dikdörtgen tercih edilir.
- Grid sınırlarını aşan boyutlar elenir.

Örnekler:

- `1 bilgisayar`: `1 x 1`
- `2 bilgisayar`: `2 x 1` veya `1 x 2`
- `4 bilgisayar`: `2 x 2`
- `9 bilgisayar`: `3 x 3`

## 7. Paylaşım ve görsel indirme

Mevcut sistemde `html2canvas` kullanılıyor. Yeni sistemde de ilk sürüm için aynı yaklaşım yeterlidir.

Özellikler:

- `Görseli İndir`: Bağış duvarını PNG olarak indirir.
- `Paylaş`: Tarayıcı destekliyorsa native share kullanır.
- `Metni Kopyala`: Genel paylaşım metnini panoya kopyalar.
- `Instagram Metnini Kopyala`: Instagram için özel metni panoya kopyalar.
- Sosyal bağlantılar: WhatsApp, X, LinkedIn, Facebook.

Dikkat edilecekler:

- Harici logo URL'leri CORS nedeniyle görsel indirmede sorun çıkarabilir.
- Mümkünse logolar uygulama içine yüklenmeli ve aynı origin üzerinden servis edilmelidir.
- Harici logo desteklenecekse indirme öncesi güvenli proxy veya base64 dönüşümü düşünülmelidir.

## 8. Teknik uygulama önerisi

İlk sürüm için önerilen yaklaşım:

- Tek uygulama içinde admin paneli ve ziyaretçi sayfası
- Kalıcı veri kaynağı olarak basit bir veritabanı
- Logo ve afiş yükleme desteği
- Client tarafında grid render
- Server tarafında veri doğrulama ve yerleşim hesaplama

Veri akışı:

1. Yönetici panelden bağışçı veya ayar değiştirir.
2. Sunucu veriyi doğrular.
3. Yerleşim yeniden hesaplanır veya manuel yerleşim doğrulanır.
4. Ön yüz güncel kampanya verisini okur.
5. Ziyaretçi tek sayfada güncel duvarı görür.

API seviyesinde gerekli temel işlemler:

- `GET /api/public/wall`: Ön yüz için yayın verisi
- `GET /api/admin/summary`: Panel özet verisi
- `GET /api/admin/donors`: Bağışçı listesi
- `POST /api/admin/donors`: Bağışçı ekleme
- `PUT /api/admin/donors/:id`: Bağışçı güncelleme
- `DELETE /api/admin/donors/:id`: Bağışçı silme veya arşivleme
- `GET /api/admin/settings`: Ayarları getirme
- `PUT /api/admin/settings`: Ayarları güncelleme
- `POST /api/admin/poster`: Kampanya afişi yükleme veya değiştirme
- `DELETE /api/admin/poster`: Kampanya afişini kaldırma
- `POST /api/admin/layout/recalculate`: Otomatik yerleşimi yeniden hesaplama
- `PUT /api/admin/layout/:donorId`: Manuel yerleşim güncelleme

## 9. İlk sürüm kabul kriterleri

Uygulama ilk sürümde şu kriterleri sağlamalıdır:

- Yönetim panelinden bağışçı eklenebilmeli.
- Bağışçı adı, bilgisayar adedi, logo ve web sitesi düzenlenebilmeli.
- Kampanya başlığı, açıklaması, renkleri ve erişim metni değiştirilebilmeli.
- Yönetim panelinden kampanya afişi yüklenebilmeli, değiştirilebilmeli ve kaldırılabilmeli.
- Tek sayfalık ön yüzde bağış duvarı doğru render edilmeli.
- Tek sayfalık ön yüzde yüklenen afiş görünmeli ve indirilebilmeli.
- Toplam bilgisayar sayısı doğru hesaplanmalı.
- Katkı veren kurumlar listesi doğru sıralanmalı.
- Manuel ve otomatik yerleşim çakışma kontrolü yapmalı.
- Paylaşım metinleri kopyalanabilmeli.
- Duvar görseli indirilebilmeli.
- Mobil ve masaüstü görünüm bozulmamalı.

## 10. Önceliklendirilmiş geliştirme planı

### Aşama 1: Temel veri ve render

- Kampanya ayar modeli oluşturulur.
- Bağışçı modeli oluşturulur.
- Yerleşim hesaplama fonksiyonu mevcut Apps Script mantığından taşınır.
- Ön yüz grid render edilir.
- Örnek verilerle ekran görüntüsüne yakın görünüm elde edilir.

### Aşama 2: Yönetim paneli

- Panel ana ekranı oluşturulur.
- Bağışçı listeleme, ekleme ve düzenleme ekranları yapılır.
- Ayarlar ekranı yapılır.
- Yerleşim hataları panelde gösterilir.

### Aşama 3: Paylaşım ve medya

- Logo yükleme veya logo URL desteği eklenir.
- Kampanya afişi yükleme, önizleme ve indirme desteği eklenir.
- Görsel indirme özelliği eklenir.
- Paylaşım linkleri ve metin kopyalama tamamlanır.

### Aşama 4: Sertleştirme

- Form validasyonları güçlendirilir.
- Mobil görünüm test edilir.
- Boş veri, hatalı logo, fazla bağışçı ve grid kapasitesi aşımı senaryoları test edilir.
- Yayına alma ayarları hazırlanır.

## 11. Açık kararlar

Bu kararlar uygulamaya başlamadan önce netleştirilmelidir:

- Yönetim panelinde kullanıcı girişi olacak mı?
- Veri kaynağı olarak dosya tabanlı JSON mu, SQLite/PostgreSQL gibi veritabanı mı kullanılacak?
- Logo yüklemeleri yerel diskte mi, bulut depolamada mı tutulacak?
- Afiş yüklemeleri logolarla aynı depolama alanında mı tutulacak?
- İlk sürümde drag-and-drop yerleşim editörü gerekli mi?
- Ön yüzde sadece yayınlanmış bağışçılar mı gösterilecek, yoksa taslak/önizleme modu da olacak mı?

## 12. Önerilen varsayılan kararlar

Hızlı ve temiz bir ilk sürüm için önerilen varsayılanlar:

- Yönetim paneli şifreli tek yönetici girişiyle korunur.
- Veri kalıcı bir veritabanında tutulur.
- Logo ve afiş dosyaları uygulamanın dosya yükleme alanında saklanır.
- İlk sürümde drag-and-drop yapılmaz; manuel yerleşim form üzerinden girilir.
- Ön yüzde sadece aktif bağışçılar gösterilir.
- Yönetim panelinde ayrı bir önizleme modu bulunur.
