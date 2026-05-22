@php use App\Helpers\Helper; @endphp
    <!DOCTYPE html>
<html lang="uz">
<head>
    <meta charset="UTF-8">
    <title>PDF</title>
    <style>
        @page {
            margin: 20px;
        }

        body {
            font-family: DejaVu Sans, sans-serif;
            line-height: 1.6;
            font-size: 12px;
            color: #000;
        }

        h4 {
            font-size: 16px;
            margin-bottom: 10px;
        }

        img {
            width: 100%;
            max-width: 100%;
            height: auto;
            display: block;
            margin-bottom: 15px;
        }

        .instruction-block {
            page-break-after: always;
        }

        .instruction-block:last-child {
            page-break-after: auto;
        }

        .content {
            margin-top: 10px;
        }
    </style>
</head>
<body>

@foreach ($instructions as $instruction)
    <div class="instruction-block">
        <h4>{{ $instruction->title }}</h4>

        @foreach ($instruction->photos as $photo)
            <img src="{{ $photo->local_path ?? Helper::fileUrl($photo->photo) }}" alt="photo">
        @endforeach

        <div class="content">
            {!! $instruction->text !!}
        </div>
    </div>
@endforeach


</body>
</html>
